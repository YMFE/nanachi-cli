import t from '@babel/types';

export function transformArrowFunctionToBindFunction(
  arrow: t.ArrowFunctionExpression
) {
  const body = t.isBlockStatement(arrow.body)
    ? arrow.body
    : t.blockStatement([t.returnStatement(arrow.body)]);

  return t.functionExpression(null, arrow.params, body);
}
