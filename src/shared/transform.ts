import t from '@babel/types';
import PlatformFragments from '@platforms/WeixinLike/platformSpecificFragments';
import { Platforms } from '@transpiler/Transpiler';
import generate from './generate';

export function arrowFunctionToBindFunction(arrow: t.ArrowFunctionExpression) {
  const body = t.isBlockStatement(arrow.body)
    ? arrow.body
    : t.blockStatement([t.returnStatement(arrow.body)]);

  return t.functionExpression(null, arrow.params, body);
}

export function logicalExpressionToTemplate(
  logicalExpression: t.LogicalExpression,
  ifAttribute: t.JSXIdentifier | t.JSXNamespacedName,
  platform: Platforms
) {
  const { left, right } = logicalExpression;
  const testString = generate(left);
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier('block'), [
      t.jsxAttribute(ifAttribute, t.stringLiteral(`{{${testString}}}`))
    ]),
    t.jsxClosingElement(t.jsxIdentifier('block')),
    normalizeJSXElementChildren(
      t.isConditionalExpression(right)
        ? transformConditionalExpression(right, platform)
        : [right],
      platform
    ) as t.JSXElement[],
    false
  );
}

export function normalizeJSXElementChildren(
  children: t.Node[],
  platform: Platforms
): t.Node[] {
  return children.map(child => {
    if (t.isStringLiteral(child)) {
      return t.jsxText(child.value);
    }

    if (t.isConditionalExpression(child)) {
      return transformConditionalExpression(child, platform)[0];
    }

    if (t.isMemberExpression(child)) {
      return t.jsxText(`{{${generate(child)}}}`);
    }

    if (t.isLogicalExpression(child)) {
      const { left, right } = child;
      const testString = generate(left);

      return t.jsxElement(
        t.jsxOpeningElement(t.jsxIdentifier('block'), [
          t.jsxAttribute(
            PlatformFragments[platform].ifAttributeName(),
            t.stringLiteral(`{{${testString}}}`)
          )
        ]),
        t.jsxClosingElement(t.jsxIdentifier('block')),
        normalizeJSXElementChildren(
          t.isConditionalExpression(right)
            ? transformConditionalExpression(right, platform)
            : [right],
          platform
        ) as t.JSXElement[],
        false
      );
    }
    return child;
  });
}

export function transformConditionalExpression(
  conditional: t.ConditionalExpression,
  platform: Platforms
): t.JSXElement[] {
  const { test, consequent, alternate } = conditional;
  const testString = replaceThis(generate(test));
  const consequentReplacement = t.isConditionalExpression(consequent)
    ? transformConditionalExpression(consequent, platform)
    : [consequent];
  const alternateReplacement = t.isConditionalExpression(alternate)
    ? transformConditionalExpression(alternate, platform)
    : [alternate];

  const replacement = [
    t.jsxElement(
      t.jsxOpeningElement(t.jsxIdentifier('block'), [
        t.jsxAttribute(
          PlatformFragments[platform].ifAttributeName(),
          t.stringLiteral(`{{${testString}}}`)
        )
      ]),
      t.jsxClosingElement(t.jsxIdentifier('block')),
      normalizeJSXElementChildren(
        t.isConditionalExpression(consequentReplacement)
          ? transformConditionalExpression(consequentReplacement, platform)
          : consequentReplacement,
        platform
      ) as t.JSXElement[],
      false
    )
  ];

  if (!t.isNullLiteral(alternate)) {
    const alternateJSX = t.isStringLiteral(alternate)
      ? [t.jsxText(alternate.value)]
      : alternateReplacement;

    replacement.push(
      t.jsxElement(
        t.jsxOpeningElement(t.jsxIdentifier('block'), [
          t.jsxAttribute(
            PlatformFragments[platform].elseIfAttributeName(),
            t.stringLiteral('true')
          )
        ]),
        t.jsxClosingElement(t.jsxIdentifier('block')),
        normalizeJSXElementChildren(alternateJSX, platform) as t.JSXElement[],
        false
      )
    );
  }

  return replacement;
}

export function replaceThis(str: string) {
  return str.replace(/^this./, '');
}

export function transformLogicalExpressionToConditionalExpression(
  node: t.LogicalExpression
) {
  return t.conditionalExpression(node.left, node.right, t.nullLiteral());
}
