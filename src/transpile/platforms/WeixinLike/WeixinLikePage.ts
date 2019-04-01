import { NodePath } from '@babel/traverse';
import t, { JSXOpeningElement } from '@babel/types';
import JavaScriptClass from '@languages/javascript/JavaScriptClass';
import Stateless from '@languages/javascript/Stateless';
import { ErrorReportableResourceState } from '@resources/Resource';
import generate from '@shared/generate';
import reportError from '@shared/reportError';
import uid from '@shared/uid';
import { relative } from 'path';
import Template from './Template';

class WeixinLikePage extends JavaScriptClass {
  public async process() {
    await this.beforeTranspile();
    this.register();
    this.registerExport();

    try {
      super.traverse();
      this.deriveTemplate();
      this.generate();
    } catch (e) {
      await this.replaceWithStatelessWhenComponentIsStateless();
    }
  }

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    super.register();
    this.registerAttrName();
  }

  private get relativePathToSourceRoot() {
    const relativePathToSourceRoot = relative(
      this.transpiler.projectSourceDirectory,
      this.rawPath
    );

    return relativePathToSourceRoot;
  }

  private get isComponent() {
    return this.relativePathToSourceRoot.startsWith('components');
  }

  private get className() {
    return this.classIdentifier.name;
  }

  private registerExport() {
    if (this.isComponent) return this.registerNativeComponent();
    this.registerNativePage();
  }

  private async replaceWithStatelessWhenComponentIsStateless() {
    if (this.classIdentifier) return;

    const stateless = new Stateless({
      rawPath: this.rawPath,
      transpiler: this.transpiler
    });

    await stateless.process();
    this.transpiler.addResource(this.rawPath, stateless);
  }

  private registerNativeComponent() {
    this.registerTraverseOption({
      ExportDefaultDeclaration: path => {
        path.insertBefore(
          t.expressionStatement(
            t.callExpression(t.identifier('Component'), [
              t.callExpression(
                t.memberExpression(
                  t.identifier('React'),
                  t.identifier('registerComponent')
                ),
                [this.classIdentifier, t.stringLiteral(this.className)]
              )
            ])
          )
        );
      }
    });
  }

  private registerNativePage() {
    this.registerTraverseOption({
      ExportDefaultDeclaration: path => {
        path.insertBefore(
          t.expressionStatement(
            t.callExpression(t.identifier('Page'), [
              t.callExpression(
                t.memberExpression(
                  t.identifier('React'),
                  t.identifier('registerPage')
                ),
                [
                  this.classIdentifier,
                  t.stringLiteral(this.relativePathToSourceRoot)
                ]
              )
            ])
          )
        );
      }
    });
  }

  private deriveTemplate() {
    const template = new Template({
      renderMethod: this.renderMethod,
      creator: this,
      rawPath: this.pathWithoutExt + '.wxml',
      transpiler: this.transpiler
    });

    template.process();

    this.transpiler.addResource(template.rawPath, template);
  }

  private addEventUidAndBeacon(
    path: NodePath<t.JSXAttribute>,
    eventName: string
  ) {
    const openingElement = path.findParent(t.isJSXOpeningElement)
      .node as JSXOpeningElement;
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
          if (attributeValue.value.startsWith('@assets')) {
            // console.log('local: ', attributeValue.value);
          } else {
            // console.log('remote: ', attributeValue.value);
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
                break;
            }
          }
        },
        exit: path => {
          this.transformIfNodeIsComponent(path);
        }
      }
    });
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
}

export default WeixinLikePage;
