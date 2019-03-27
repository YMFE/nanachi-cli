import { NodePath } from '@babel/traverse';
import t, { JSXOpeningElement } from '@babel/types';
import JavaScriptClass from '@languages/javascript/JavaScriptClass';
import { ErrorReportableResourceState } from '@resources/Resource';
import generate from '@shared/generate';
import reportError from '@shared/reportError';
import uid from '@shared/uid';
import { relative, resolve } from 'path';
import Template from './Template';

class WeixinLikePage extends JavaScriptClass {
  public async process() {
    await this.beforeTranspile();
    this.register();
    this.registerExport();
    super.traverse();
    this.deriveTemplate();
    this.generate();

    // console.log(this.content);
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
  }

  private addEventUidAndBeacon(
    path: NodePath<t.JSXAttribute>,
    eventName: string
  ) {
    (path.findParent(t.isJSXOpeningElement)
      .node as JSXOpeningElement).attributes.push(
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
      JSXElement: path => {
        const openingElement = path.get('openingElement');
        const closingElement = path.get('closingElement');
        const openingNode = openingElement.get('name').node;

        if (t.isJSXIdentifier(openingNode)) {
          const openingNodeName = openingNode.name;

          switch (openingNodeName) {
            case 'p':
            case 'div':
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
      }
    });
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
