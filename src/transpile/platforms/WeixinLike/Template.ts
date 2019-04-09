import { NodePath } from '@babel/traverse';
import t from '@babel/types';
import { IDerivedResource } from '@resources/DerivedCodeResource';
import DerivedJavaScriptTraversable from '@resources/DerivedJavaScriptTraversable';
import { ErrorReportableResourceState } from '@resources/Resource';
import generate from '@shared/generate';
import reportError from '@shared/reportError';
import inlineElements from './inlineElements';
import platformSpecificFragments from './platformSpecificFragments';

interface ITemplate extends IDerivedResource {
  renderMethod: t.ClassMethod | t.FunctionDeclaration;
  configObject?: any;
}

class Template extends DerivedJavaScriptTraversable {
  public renderMethod: t.ClassMethod | t.FunctionDeclaration;

  private usingComponents: string[] = [];
  private configObject: any = null;

  constructor({ renderMethod, configObject, ...resource }: ITemplate) {
    super(resource);

    this.renderMethod = renderMethod;
    this.configObject = configObject;
  }

  public process() {
    this.setAst(t.file(t.program([this.renderMethod.body]), [], []));

    this.register();
    this.traverse();
    this.deriveJSON();

    this.setContent(this.templateLiteral);
  }

  public get templateLiteral() {
    const renderRootNode = (this.ast as any).program.body[0].body[0];

    return t.isJSXElement(renderRootNode)
      ? generate(renderRootNode)
      : generate(renderRootNode.argument);
  }

  private register() {
    this.registerTraverseOption({
      JSXAttribute: {
        enter: path => {
          this.replaceAttributeName(path);
          this.replaceAttributeValueLiteral(path);
        }
      },
      JSXElement: path => {
        this.transformIfNodeIsReactUseComponent(path);
        this.replaceJSXElementChildren(path);
      },
      JSXText: path => {
        this.removeInlineElementText(path);
      },
      TemplateLiteral: path => {
        this.transformTemplate(path);
      },
      IfStatement: path => {
        const { node } = path;

        path.replaceWithMultiple(
          this.transformConditionalExpression(
            this.transformIfStatementToConditionalExpression(node)
          )
        );
      },
      LogicalExpression: path => {
        const { node } = path;

        path.replaceWith(
          this.transformLogicalExpressionToConditionalExpression(node)
        );
      }
    });
  }

  private removeInlineElementText(path: NodePath<t.JSXText>) {
    const parentPath = path.parentPath;

    if (t.isJSXElement(parentPath.node)) {
      const { openingElement } = parentPath.node;

      if (t.isJSXIdentifier(openingElement.name)) {
        const { name } = openingElement.name;

        if (inlineElements[name]) {
          const { value } = path.node;
          if (value) {
            path.node.value = value.trim();
          } else {
            path.remove();
          }
        }
      }
    }
  }

  private deriveJSON() {
    if (this.configObject === null) return;

    for (const name of this.usingComponents) {
      const tagName = `anu-${name.toLocaleLowerCase()}`;
      const location = `/components/${name}/index`;

      this.configObject.usingComponents =
        this.configObject.usingComponents || {};
      this.configObject.usingComponents[tagName] = location;
    }
  }

  private transformIfNodeIsReactUseComponent(path: NodePath<t.JSXElement>) {
    const {
      node: {
        openingElement: { attributes },
        openingElement,
        closingElement
      }
    } = path;

    if (t.isJSXMemberExpression(openingElement.name)) {
      let componentName: string = '';
      let instanceUidAttribute: t.JSXAttribute;

      for (const attribute of attributes) {
        if (t.isJSXAttribute(attribute)) {
          const {
            name: { name }
          } = attribute;

          if (name === 'is') {
            const { value } = attribute;

            componentName = (value as t.StringLiteral).value;
            this.usingComponents.push(componentName);
          }

          if (name === 'data-instance-uid') {
            instanceUidAttribute = attribute;
          }
        }
      }

      attributes.splice(0, attributes.length, instanceUidAttribute!);

      const lowerComponentName = componentName.toLocaleLowerCase();
      const tagName = `anu-${lowerComponentName}`;

      openingElement.name = t.jsxIdentifier(tagName);

      if (closingElement) {
        closingElement.name = t.jsxIdentifier(tagName);
      }
    }
  }

  private transformTemplate(template: NodePath<t.TemplateLiteral>) {
    const { expressions, quasis } = template.node;

    let codeStr = '';

    for (let i = 0; i < expressions.length; i++) {
      codeStr = codeStr + quasis[i].value.raw;

      if (i < quasis.length) {
        codeStr = codeStr + `{{${generate(expressions[i])}}}`;
      }
    }

    template.parentPath.replaceWith(t.stringLiteral(codeStr));
  }

  private replaceThis(str: string) {
    return str.replace(/^this./, '');
  }

  private transformStyle(path: NodePath<t.JSXAttribute>) {
    const { node } = path.get('value');
    const call = (node as t.JSXExpressionContainer).expression;

    if (t.isCallExpression(call)) {
      const { value: id } = call.arguments[2] as t.StringLiteral;

      path.get('value').replaceWith(t.stringLiteral(`{{props['${id}']}}`));
    }
  }

  private addCanvasId(path: NodePath<t.JSXAttribute>) {
    const { node: opening } = path.findParent(t.isJSXOpeningElement);
    const { attributes } = opening as t.JSXOpeningElement;

    attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier('canvas-id'),
        t.stringLiteral((path.node.value as t.StringLiteral).value)
      )
    );
  }

  private replaceAttributeName(path: NodePath<t.JSXAttribute>) {
    const jsxElement = path.findParent(t.isJSXElement);
    const { openingElement } = jsxElement.node as t.JSXElement;
    const { node } = path.get('name');

    if (t.isJSXIdentifier(node)) {
      switch (true) {
        case node.name === 'style':
          this.transformStyle(path);
          break;

        case node.name === 'id':
          if (t.isJSXIdentifier(openingElement.name, { name: 'canvas' })) {
            this.addCanvasId(path);
          }

          break;

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
              t.stringLiteral(`{{${this.replaceThis(generate(expression!))}}}`)
            );

          break;

        case t.isBinaryExpression(expression):
          path
            .get('value')
            .replaceWith(
              t.stringLiteral(
                `{{${this.transformOrdinaryBinaryExpression(
                  expression as t.BinaryExpression
                )}}}`
              )
            );
          break;

        case t.isStringLiteral(expression):
          path
            .get('value')
            .replaceWith(
              t.stringLiteral((expression as t.StringLiteral).value)
            );

        default:
          break;
      }
    }
  }

  private transformOrdinaryBinaryExpression(binary: t.BinaryExpression) {
    const { operator, left, right } = binary;
    let leftCode: string;
    let rightCode: string;

    if (t.isBinaryExpression(left)) {
      leftCode = this.transformOrdinaryBinaryExpression(left);
    } else {
      if (t.isStringLiteral(left)) {
        leftCode = `'${left.value}'`;
      } else {
        leftCode = this.replaceThis(generate(left));
      }
    }

    rightCode = this.replaceThis(generate(right));

    return leftCode + operator + rightCode;
  }

  private replaceJSXElementChildren(path: NodePath<t.JSXElement>) {
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
            element.replaceWith(t.jsxText(''));
            break;

          case t.isIdentifier(expression):
          case t.isMemberExpression(expression):
            element.replaceWith(
              t.jsxText(`{{${this.replaceThis(generate(expression))}}}`)
            );
            break;

          case t.isCallExpression(expression):
            this.replaceMapCall(element.get('expression') as NodePath<
              t.CallExpression
            >);
            break;

          case t.isConditionalExpression(expression):
            element.replaceWithMultiple(
              this.transformConditionalExpression(
                expression as t.ConditionalExpression
              )
            );
            break;

          default:
            break;
        }
      }
    });
  }

  private replaceMapCall(call: NodePath<t.CallExpression>) {
    // 移除末尾的 .map
    const calleeString = generate(call.node.callee).slice(0, -4);
    const calleeStringWithoutThis = this.replaceThis(calleeString);
    const [functionNode] = call.node.arguments;

    if (t.isFunctionExpression(functionNode)) {
      const [itemValueNode, itemIndexNode] = functionNode.params;
      const { body } = functionNode;
      const itemValueName = (itemValueNode as t.Identifier).name;
      const itemIndexName = (itemIndexNode as t.Identifier).name;
      const returnStatement = this.normalizeMapCallFunctionBody(body);
      const { platform } = this.transpiler;

      const attributes = [];
      const loopForAttributeName =
        platformSpecificFragments[platform].loopAttributeName;
      const loopForAttributeItemName =
        platformSpecificFragments[platform].loopAttributeItemName;
      const loopForAttributeIndexName =
        platformSpecificFragments[platform].loopAttributeIndexName;
      const loopForAttributeKey =
        platformSpecificFragments[platform].loopAttributeKey;
      const loopForAttributeKeyNode = loopForAttributeKey();

      attributes.push(
        t.jsxAttribute(
          loopForAttributeName(),
          t.stringLiteral(`{{${calleeStringWithoutThis}}}`)
        )
      );

      attributes.push(
        t.jsxAttribute(
          loopForAttributeItemName(),
          t.stringLiteral(`${itemValueName}`)
        )
      );

      attributes.push(
        t.jsxAttribute(
          loopForAttributeIndexName(),
          t.stringLiteral(`${itemIndexName}`)
        )
      );

      if (loopForAttributeKeyNode !== null) {
        attributes.push(loopForAttributeKeyNode);
      }

      call.parentPath.replaceWith(
        t.jsxElement(
          t.jsxOpeningElement(t.jsxIdentifier('block'), attributes),
          t.jsxClosingElement(t.jsxIdentifier('block')),
          this.normalizeJSXElementChildren([
            returnStatement as t.Node
          ]) as t.JSXElement[],
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
          return this.transformIfStatementToConditionalExpression(node);
        }
        if (t.isLogicalExpression(node)) {
          return this.transformLogicalExpressionToConditionalExpression(node);
        }

      case 2:
        const [mayBeIfStatement, mayBeReturnStatement] = body.body as any;

        if (
          t.isIfStatement(mayBeIfStatement) &&
          t.isReturnStatement(mayBeReturnStatement) &&
          mayBeIfStatement.alternate === null
        ) {
          mayBeIfStatement.alternate = t.blockStatement([mayBeReturnStatement]);
          return this.transformIfStatementToConditionalExpression(
            mayBeIfStatement
          );
        } else {
          this.state = ErrorReportableResourceState.Error;
          this.error = new Error(
            'In `render` method, if there are 2 nodes, the first must be a IfStatement without `else`' +
              'and the second must be a ReturnStatement.'
          );
          reportError(this);
          break;
        }

      default:
        this.state = ErrorReportableResourceState.Error;
        this.error = new Error(
          'There should only be only one ReturnStatement or IfStatement, ' +
            'or one IfStatement following with a ReturnStatement in the body of`render`'
        );
        reportError(this);
        break;
    }
  }

  private transformLogicalExpressionToConditionalExpression(
    node: t.LogicalExpression
  ) {
    return t.conditionalExpression(node.left, node.right, t.nullLiteral());
  }

  private transformIfStatementToConditionalExpression(node: t.IfStatement) {
    const { test, consequent, alternate } = node;

    return t.conditionalExpression(
      test,
      this.transformConsequent(consequent) as t.Expression,
      this.transformConsequent(alternate) as t.Expression
    );
  }

  private reportInvalidConsequent(consequent: t.BlockStatement) {
    this.state = ErrorReportableResourceState.Error;
    this.error = new Error(
      'IfStatement in render method must contain and only ' +
        'contain one ReturnStatement, got ' +
        consequent.body.length +
        ' Statements.'
    );
    reportError(this);

    return t.nullLiteral();
  }

  private transformConsequent(consequent: t.Node | null) {
    if (consequent === null) return t.nullLiteral();

    if (t.isBlockStatement(consequent)) {
      if (consequent.body.length === 0 || consequent.body.length > 1) {
        return this.reportInvalidConsequent(consequent);
      }

      const firstNode = consequent.body[0];

      if (t.isReturnStatement(firstNode)) {
        return firstNode.argument;
      } else {
        return this.reportInvalidConsequent(consequent);
      }
    } else {
      return consequent;
    }
  }

  private normalizeJSXElementChildren(children: t.Node[]) {
    return children.map(child => {
      if (t.isStringLiteral(child)) {
        return t.jsxText(child.value);
      }
      if (t.isConditionalExpression(child)) {
        return this.transformConditionalExpression(child)[0];
      }
      return child;
    });
  }

  private transformConditionalExpression(
    conditional: t.ConditionalExpression
  ): t.JSXElement[] {
    const { test, consequent, alternate } = conditional;
    const testString = this.replaceThis(generate(test));
    const consequentReplacement = t.isConditionalExpression(consequent)
      ? this.transformConditionalExpression(consequent)
      : [consequent];
    const alternateReplacement = t.isConditionalExpression(alternate)
      ? this.transformConditionalExpression(alternate)
      : [alternate];

    const replacement = [
      t.jsxElement(
        t.jsxOpeningElement(t.jsxIdentifier('block'), [
          t.jsxAttribute(
            t.jsxNamespacedName(t.jsxIdentifier('wx'), t.jsxIdentifier('if')),
            t.stringLiteral(`{{${testString}}}`)
          )
        ]),
        t.jsxClosingElement(t.jsxIdentifier('block')),
        this.normalizeJSXElementChildren(
          t.isConditionalExpression(consequentReplacement)
            ? this.transformConditionalExpression(consequentReplacement)
            : consequentReplacement
        ) as t.JSXElement[],
        false
      )
    ];

    if (alternate === null || !t.isNullLiteral(alternate)) {
      const alternateJSX = t.isStringLiteral(alternate)
        ? [t.jsxText(alternate.value)]
        : alternateReplacement;

      replacement.push(
        t.jsxElement(
          t.jsxOpeningElement(t.jsxIdentifier('block'), [
            t.jsxAttribute(
              t.jsxNamespacedName(
                t.jsxIdentifier('wx'),
                t.jsxIdentifier('elif')
              ),
              t.stringLiteral('true')
            )
          ]),
          t.jsxClosingElement(t.jsxIdentifier('block')),
          this.normalizeJSXElementChildren(alternateJSX) as t.JSXElement[],
          false
        )
      );
    }

    return replacement;
  }
}

export default Template;
