import { transformFromAstSync } from '@babel/core';
import generate from '@babel/generator';
import { NodePath } from '@babel/traverse';
import t from '@babel/types';
import { InterfaceDerivedResource } from '@resources/DerivedCodeResource';
import DerivedJavaScriptTraversable from '@resources/DerivedJavaScriptTraversable';

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
  }

  public get templateLiteral() {
    return generate(this.templateNode).code;
  }

  private register() {
    this.registerTraverseOption({
      JSXAttribute: {
        exit: path => {
          this.replaceAttributeValueLiteral(path);
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
}

export default Template;
