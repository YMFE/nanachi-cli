import { transformFromAstSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import t from '@babel/types';
import builtInElements from '@platforms/WeixinLike/builtInElements';
import Template from '@platforms/WeixinLike/Template';
import { ErrorReportableResourceState } from '@resources/Resource';
import WritableResource from '@resources/WritableResource';
import generate from '@shared/generate';
import reportError from '@shared/reportError';
import { transformArrowFunctionToBindFunction } from '@shared/transform';
import uid from '@shared/uid';
import { relative } from 'path';
import JavaScript from './JavaScript';

class Stateless extends JavaScript {
  private renderMethod: t.FunctionDeclaration;
  private configObject: any = { component: true };

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    this.registerAttrName();
    this.registerTransformStateless();
    this.registerRemoveImport();
    this.registerComponent();
  }

  public async process() {
    await this.beforeTranspile();
    this.register();
    this.traverse();
    this.injectReactLibrary();
    this.generate();
    this.deriveTemplate();
    this.deriveJSON();
  }

  public injectReactLibrary() {
    const { location } = this.transpiler.resolveSync('@react', this.dir);
    const reactResource = this.transpiler.resources.get(location);
    const destLocation = reactResource!.destPath;
    const relativeReactLibraryPath = relative(this.destDir, destLocation);
    const normalizedReactLibraryPath = relativeReactLibraryPath.startsWith('.')
      ? relativeReactLibraryPath
      : `./${relativeReactLibraryPath}`;
    const importNode = t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('React'))],
      t.stringLiteral(normalizedReactLibraryPath)
    );
    this.ast.program.body.unshift(importNode);
  }

  private deriveJSON() {
    const jsonResource = new WritableResource({
      rawPath: this.pathWithoutExt + '.json',
      transpiler: this.transpiler
    });

    jsonResource.setContent(JSON.stringify(this.configObject, null, 4));

    this.transpiler.addResource(this.pathWithoutExt + '.json', jsonResource);
  }

  private registerRemoveImport() {
    this.registerTraverseOption({
      ImportDeclaration: path => {
        path.remove();
      }
    });
  }

  private registerComponent() {
    this.registerTraverseOption({
      ExportDefaultDeclaration: path => {
        const { declaration } = path.node;
        let { id } = declaration as t.FunctionDeclaration;

        if (id == null) {
          id = t.identifier('Stateless');
        }

        const name = id.name;
        path.insertBefore(declaration);
        path.insertBefore(
          t.expressionStatement(
            t.callExpression(t.identifier('Component'), [
              t.callExpression(
                t.memberExpression(
                  t.identifier('React'),
                  t.identifier('registerComponent')
                ),
                [id, t.stringLiteral(name)]
              )
            ])
          )
        );
        path.node.declaration = id;
      }
    });
  }

  private registerTransformStateless() {
    this.registerTraverseOption({
      FunctionDeclaration: {
        enter: path => {
          const { id } = path.node;

          if (id !== null) {
            const { name } = id;
            const regexStartsWithCapitalizedLetter = /^[A-Z]/;

            if (regexStartsWithCapitalizedLetter.test(name)) {
              this.renderMethod = path.node;
            }
          }
        },
        exit: path => {
          this.transformArrayMap(path);
          this.transformReact(path);
        }
      }
    });
  }

  private transformArrayMap(path: NodePath<t.FunctionDeclaration>) {
    path.traverse({
      CallExpression: callPath => {
        this.transformArrayMapCallExpression(callPath);
      },
      ArrowFunctionExpression: callPath => {
        this.transformArrayMapArrowExpression(callPath);
      }
    });
  }

  private deriveTemplate() {
    const template = new Template({
      renderMethod: this.renderMethod,
      creator: this,
      rawPath: this.pathWithoutExt + '.wxml',
      transpiler: this.transpiler,
      configObject: this.configObject
    });

    template.process();

    this.transpiler.addResource(template.rawPath, template);
  }

  private transformIfNodeIsComponent(path: NodePath<t.JSXElement>) {
    const {
      node: {
        openingElement,
        openingElement: { attributes },
        closingElement
      }
    } = path;

    if (t.isJSXOpeningElement(openingElement)) {
      if (t.isJSXIdentifier(openingElement.name)) {
        const rawName = openingElement.name.name;

        if (/^[A-Z]/.test(rawName)) {
          const useComponentNode = t.jsxMemberExpression(
            t.jsxIdentifier('React'),
            t.jsxIdentifier('useComponent')
          );

          openingElement.name = useComponentNode;

          if (closingElement) {
            closingElement.name = useComponentNode;
          }

          const callback = path.findParent(t.isCallExpression);
          let instanceUidValue: t.Node;

          if (callback) {
            const { params } = (callback as any).node.arguments[0];
            const [, indexNode] = params;

            instanceUidValue = t.binaryExpression(
              '+',
              t.stringLiteral(uid.next()),
              t.identifier(indexNode.name)
            );
          } else {
            instanceUidValue = t.stringLiteral(uid.next());
          }

          attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-instance-uid'),
              t.jsxExpressionContainer(instanceUidValue)
            )
          );

          attributes.push(
            t.jsxAttribute(t.jsxIdentifier('is'), t.stringLiteral(rawName))
          );
        }
      }
    }
  }

  private transformArrayMapCallExpression(path: NodePath<t.CallExpression>) {
    const callee = path.get('callee');

    if (t.isMemberExpression(callee.node)) {
      const args = path.node.arguments;

      if (args.length < 2) {
        args.push(t.thisExpression());
      }

      const mapCallback = args[0];

      if (t.isFunctionExpression(mapCallback)) {
        const params = mapCallback.params;

        if (params.length < 2) {
          const indexUid = 'i_' + uid.next();

          this.replaceDataIdInMapCall(path, indexUid);

          params.push(t.identifier(indexUid));
        } else {
          this.replaceDataIdInMapCall(path, (params[1] as t.Identifier).name);
        }
      }
    }
  }

  private replacingClosingElementWithName(
    closingElement: NodePath<t.JSXClosingElement | null>,
    name: string
  ) {
    if (t.isJSXClosingElement(closingElement)) {
      const closingNode = closingElement.node;

      if (t.isJSXClosingElement(closingNode)) {
        const closingName = closingNode.name;

        if (t.isJSXIdentifier(closingName)) {
          closingName.name = name;
        }
      }
    }
  }

  private registerAttrName() {
    this.registerTraverseOption({
      JSXAttribute: path => {
        this.replaceAttributeName(path);
        this.replaceAssetsPath(path);
        this.replaceStyle(path);
      },
      JSXElement: {
        enter: path => {
          const openingElement = path.get('openingElement');
          const closingElement = path.get('closingElement');
          const openingNode = openingElement.get('name').node;

          if (t.isJSXIdentifier(openingNode)) {
            const openingNodeName = openingNode.name;

            switch (openingNodeName) {
              case 'p':
              case 'div':
              case 'li':
              case 'h1':
              case 'h2':
              case 'h3':
              case 'h4':
              case 'h5':
              case 'h6':
              case 'quoteblock':
                openingNode.name = 'view';
                this.replacingClosingElementWithName(closingElement, 'view');

                break;

              case 'span':
              case 'b':
              case 's':
              case 'code':
              case 'quote':
              case 'cite':
                openingNode.name = 'text';
                this.replacingClosingElementWithName(closingElement, 'text');

                break;
              default:
                if (builtInElements[openingNodeName] === undefined) {
                  openingNode.name = 'view';
                  this.replacingClosingElementWithName(closingElement, 'view');
                }
            }
          }
          this.transformIfNodeIsComponent(path);
        },
        exit: path => {
          this.transformIfNodeIsComponent(path);
        }
      }
    });
  }

  private replaceAttributeName(path: NodePath<t.JSXAttribute>) {
    const { node } = path.get('name');

    if (t.isJSXIdentifier(node)) {
      switch (true) {
        case node.name === 'className':
          node.name = 'class';
          break;

        case /^catch[A-Z]/.test(node.name):
          this.addEventUidAndBeacon(path, node.name.slice(5));
          break;

        case /^on[A-Z]/.test(node.name):
          this.addEventUidAndBeacon(path, node.name.slice(2));

        default:
          break;
      }
    }
  }

  private replaceAssetsPath(path: NodePath<t.JSXAttribute>) {
    const { node: attributeName } = path.get('name');
    const { node: attributeValue } = path.get('value');

    if (t.isJSXIdentifier(attributeName)) {
      if (attributeName.name === 'src') {
        if (t.isStringLiteral(attributeValue)) {
          if (/^https?:\/\//.test(attributeValue.value)) {
            // console.log('remote: ', attributeValue.value);
          } else {
            // console.log('local: ', attributeValue.value);
            const id = attributeValue.value;
            const { location } = this.transpiler.resolveSync(id, this.dir);
            attributeValue.value = location;
          }
        }
      }
    }
  }

  private replaceStyle(path: NodePath<t.JSXAttribute>) {
    const { node: attributeName } = path.get('name');
    const { node: attributeValue } = path.get('value');

    if (t.isJSXIdentifier(attributeName)) {
      if (attributeName.name === 'style') {
        if (t.isJSXExpressionContainer(attributeValue)) {
          const { expression } = attributeValue;

          switch (true) {
            case t.isIdentifier(expression) ||
              t.isMemberExpression(expression) ||
              t.isObjectExpression(expression):
              path
                .get('value')
                .replaceWith(
                  t.jsxExpressionContainer(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('React'),
                        t.identifier('toStyle')
                      ),
                      [
                        expression as t.Identifier,
                        t.memberExpression(
                          t.thisExpression(),
                          t.identifier('props')
                        ),
                        t.stringLiteral(uid.next())
                      ]
                    )
                  )
                );

              return;

            default:
              if (t.isStringLiteral(expression)) return;
              if (t.isCallExpression(expression)) {
                if (t.isMemberExpression(expression.callee)) {
                  if (
                    t.isIdentifier(expression.callee.object, {
                      name: 'React'
                    })
                  ) {
                    return;
                  }
                }
              }

              this.state = ErrorReportableResourceState.Error;
              this.error =
                `Props "style"'s value's type should be one of ` +
                `Identifier, MemberExpression or ObjectExpression,` +
                ` got "${generate(expression)}" at line ${
                  expression.loc ? expression.loc.start.line : 'unknown'
                }`;
              reportError(this);
              break;
          }
        }
      }
    }
  }

  private addEventUidAndBeacon(
    path: NodePath<t.JSXAttribute>,
    eventName: string
  ) {
    const openingElement = path.findParent(t.isJSXOpeningElement)
      .node as t.JSXOpeningElement;
    const { name, attributes } = openingElement;
    const eventAttribute = attributes.find(attribute => {
      if (t.isJSXAttribute(attribute)) {
        const { name: attributeName } = attribute;
        if (t.isJSXIdentifier(attributeName)) {
          const eventRegex = new RegExp(`^(on|catch)${eventName}$`);

          if (eventRegex.test(attributeName.name)) {
            return true;
          }
        }
      }
      return false;
    });

    if (eventName === 'Click') eventName = 'Tap';

    if (t.isJSXIdentifier(name)) {
      const nodeName = name.name;
      if (nodeName === 'input' || nodeName === 'textarea') {
        eventName = 'Input';
      }
    }

    (eventAttribute! as t.JSXAttribute).name = t.jsxIdentifier(
      `on${eventName}`
    );

    openingElement.attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier(`data-${eventName.toLocaleLowerCase()}-uid`),
        t.stringLiteral(uid.next())
      ),
      t.jsxAttribute(
        t.jsxIdentifier('data-beacon-uid'),
        t.stringLiteral('default')
      )
    );
  }

  private replaceDataIdInMapCall(
    path: NodePath<t.CallExpression>,
    indexUid: string
  ) {
    path.traverse({
      JSXAttribute: node => {
        const attributeName = node.get('name');
        const attributeValue = node.get('value');

        if (t.isJSXIdentifier(attributeName.node)) {
          const dataTypeResult = attributeName.node.name.match(
            /^data-([a-z]+)-uid/
          );

          if (dataTypeResult) {
            const [, type] = dataTypeResult;
            if (type !== 'beacon') {
              if (t.isStringLiteral(attributeValue.node)) {
                const id = attributeValue.node.value;

                attributeValue.replaceWith(
                  t.jsxExpressionContainer(
                    t.binaryExpression(
                      '+',
                      t.stringLiteral(id),
                      t.identifier(indexUid)
                    )
                  )
                );
              }
            }
          }
        }
      }
    });
  }

  private transformArrayMapArrowExpression(
    path: NodePath<t.ArrowFunctionExpression>
  ) {
    path.replaceWith(transformArrowFunctionToBindFunction(path.node));

    this.transformArrayMapCallExpression(path.findParent(
      t.isCallExpression
    ) as any);
  }

  private transformReact(path: NodePath<t.FunctionDeclaration>) {
    this.renderMethod = t.cloneDeep(path.node);

    const renderNode = t.program([path.node.body]);

    const result = transformFromAstSync(renderNode, undefined, {
      presets: [[require('@babel/preset-react'), { pragma: 'h' }]],
      ast: true,
      code: false
    });

    const renderRoot = result!.ast!.program.body[0];

    (renderRoot as t.BlockStatement).body.unshift(
      t.variableDeclaration('var', [
        t.variableDeclarator(
          t.identifier('h'),
          t.memberExpression(
            t.identifier('React'),
            t.identifier('createElement')
          )
        )
      ])
    );

    (path.node.body as any) = renderRoot;
  }
}

export default Stateless;
