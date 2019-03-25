import { transformFromAstSync } from '@babel/core';
import generate from '@babel/generator';
import { NodePath } from '@babel/traverse';
import t, { JSXElement } from '@babel/types';
import { InterfaceDerivedResource } from '@resources/DerivedCodeResource';
import DerivedJavaScriptTraversable from '@resources/DerivedJavaScriptTraversable';
import { ErrorReportableResourceState } from '@resources/Resource';
import reportError from '@shared/reportError';

interface InterfaceTemplate extends InterfaceDerivedResource {
  renderMethod: t.ClassMethod;
}

class Template extends DerivedJavaScriptTraversable {
  public renderMethod: t.ClassMethod;

  private templateNode: t.Node;

  constructor({ renderMethod, ...resource }: InterfaceTemplate) {
    super(resource);

    this.renderMethod = renderMethod;
  }

  public async process() {
    this.setAst(t.file(t.program([this.renderMethod.body]), [], []));

    this.register();

    this.traverse();
    this.transformTemplateString();

    console.log(this.templateLiteral);
  }

  public get templateLiteral() {
    return generate(this.templateNode).code;
  }

  private register() {
    this.registerTraverseOption({
      JSXAttribute: {
        enter: path => {
          this.replaceAttributeName(path);
          this.replaceAttributeValueLiteral(path);
        }
      },
      JSXElement: {
        exit: path => {
          this.replaceJSXElementChildren(path);
        }
      }
    });
  }

  private transformTemplateString() {
    const renderNode = t.program([this.renderMethod.body]);

    const result = transformFromAstSync(renderNode, undefined, {
      plugins: [
        [require('@babel/plugin-transform-template-literals'), { loose: true }]
      ],
      ast: true
    });

    this.templateNode = (result!.ast!.program.body as any)[0].body[0].argument;
  }

  private replaceThis(str: string) {
    return str.replace(/^this./, '');
  }

  private replaceAttributeName(path: NodePath<t.JSXAttribute>) {
    const { node } = path.get('name');

    if (t.isJSXIdentifier(node)) {
      switch (true) {
        case /^catch[A-Z]/.test(node.name):
          node.name = `catch${node.name.slice(5).toLocaleLowerCase()}`;
          path.get('value').replaceWith(t.stringLiteral('dispatchEvent'));
          break;

        case /^on[A-Z]/.test(node.name):
          node.name = `bind${node.name.slice(2).toLocaleLowerCase()}`;
          path.get('value').replaceWith(t.stringLiteral('dispatchEvent'));

        default:
          break;
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
            .replaceWith(
              t.stringLiteral(
                `{{${this.replaceThis(generate(expression!).code)}}}`
              )
            );

          break;

        default:
          break;
      }
    }
  }

  private replaceJSXElementChildren(path: NodePath<JSXElement>) {
    const children = path.get('children');

    children.forEach(element => {
      if (t.isJSXExpressionContainer(element.node)) {
        const {
          node: { expression }
        } = element;

        switch (true) {
          case t.isStringLiteral(expression):
            element.replaceWith(expression);
            break;

          case t.isBooleanLiteral(expression):
            element.replaceWith(t.stringLiteral(''));
            break;

          case t.isIdentifier(expression):
          case t.isMemberExpression(expression):
            element.replaceWith(
              t.stringLiteral(
                `{{${this.replaceThis(generate(expression).code)}}}`
              )
            );
            break;

          case t.isCallExpression(expression):
            this.replaceMapCall(element.get('expression') as NodePath<
              t.CallExpression
            >);
            break;

          default:
            break;
        }
      }
    });
  }

  private replaceMapCall(call: NodePath<t.CallExpression>) {
    const calleeString = this.replaceThis(generate(call.node.callee).code).slice(0, -4);
    const [functionNode] = call.node.arguments;

    if (t.isFunctionExpression(functionNode)) {
      const [itemValueNode, itemIndexNode] = functionNode.params;
      const { body } = functionNode;

      const itemValueName = (itemValueNode as t.Identifier).name;
      const itemIndexName = (itemIndexNode as t.Identifier).name;

      const returnStatement = this.normalizeMapCallFunctionBody(body);

      call.parentPath.replaceWith(
        t.jsxElement(
          t.jsxOpeningElement(t.jsxIdentifier('block'), [
            t.jsxAttribute(
              t.jsxNamespacedName(
                t.jsxIdentifier('wx'),
                t.jsxIdentifier('for')
              ),
              t.stringLiteral(calleeString)
            ),
            t.jsxAttribute(
              t.jsxNamespacedName(
                t.jsxIdentifier('wx'),
                t.jsxIdentifier('for-item')
              ),
              t.stringLiteral(itemValueName)
            ),
            t.jsxAttribute(
              t.jsxNamespacedName(
                t.jsxIdentifier('wx'),
                t.jsxIdentifier('for-index')
              ),
              t.stringLiteral(itemIndexName)
            ),
            t.jsxAttribute(
              t.jsxNamespacedName(
                t.jsxIdentifier('wx'),
                t.jsxIdentifier('key')
              ),
              t.stringLiteral('*this')
            )
          ]),
          t.jsxClosingElement(t.jsxIdentifier('block')),
          [returnStatement as t.JSXElement],
          false
        )
      );
    }
  }

  private normalizeMapCallFunctionBody(body: t.BlockStatement) {
    switch (body.body.length) {
      case 0:
        return t.nullLiteral();

      case 1:
        const node = body.body[0] as any;

        if (t.isReturnStatement(node)) return node.argument;
        if (t.isIfStatement(node)) {
          return transformIfStatementToConditionalExpression(node);
        }

      default:
        this.state = ErrorReportableResourceState.Error;
        this.error = new Error(
          'There should only be only one ReturnStatement or IfStatement in the body of`render`'
        );
        reportError(this);
        break;
    }
  }
}

function transformIfStatementToConditionalExpression(node: t.IfStatement) {
  const { test, consequent, alternate } = node;
  console.log(123);
}

export default Template;
