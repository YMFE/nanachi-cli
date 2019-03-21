import generate from '@babel/generator';
import { NodePath } from '@babel/traverse';
import t, { JSXOpeningElement } from '@babel/types';
import JavaScriptPage from '@languages/javascript/JavaScriptPage';
import { ErrorReportableResourceState } from '@resources/Resource';
import reportError from '@shared/reportError';
import uid from '@shared/uid';

class WeixinLikePage extends JavaScriptPage {
  public async process() {
    await this.beforeTranspile();

    this.register();

    super.traverse();

    this.generate();

    console.log(this.content);
  }

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    super.register();
    this.registerAttrName();
  }

  private addEventUidAndBeacon(
    path: NodePath<t.JSXAttribute>,
    eventName: string
  ) {
    (path.findParent(t.isJSXOpeningElement)
      .node as JSXOpeningElement).attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier(`data-${eventName.toLocaleLowerCase()}-id`),
        t.stringLiteral(uid.next())
      ),
      t.jsxAttribute(
        t.jsxIdentifier('data-beacon-id'),
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
          node.name = `catch${node.name.slice(5).toLocaleLowerCase()}`;
          path.get('value').replaceWith(t.stringLiteral('dispatchEvent'));
          break;

        case /^on[A-Z]/.test(node.name):
          this.addEventUidAndBeacon(path, node.name.slice(2));
          node.name = `bind${node.name.slice(2).toLocaleLowerCase()}`;
          path.get('value').replaceWith(t.stringLiteral('dispatchEvent'));

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

  private replaceAttributeValueLiteral(path: NodePath<t.JSXAttribute>) {
    const { node: attributeValue } = path.get('value');

    if (t.isJSXExpressionContainer(attributeValue)) {
      const { expression } = attributeValue;
      switch (true) {
        case t.isNumericLiteral(expression):
        case t.isIdentifier(expression):
        case t.isNullLiteral(expression):
        case t.isBooleanLiteral(expression):
        case t.isLogicalExpression(expression):
        case t.isUnaryExpression(expression):
        case t.isConditionalExpression(expression):
        case t.isMemberExpression(expression):
          path
            .get('value')
            .replaceWith(t.stringLiteral(`{{${generate(expression!).code}}}`));

          break;

        default:
          break;
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
                ` got "${generate(expression).code}" at line ${
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
        // this.replaceAttributeValueLiteral(path);
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
