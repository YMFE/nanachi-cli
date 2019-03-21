import { NodePath } from '@babel/traverse';
import t from '@babel/types';

export function isMemberExpressionContainsThis(
  node: NodePath<t.Node>
): boolean {
  if (t.isThisExpression(node)) return true;
  if (!t.isMemberExpression(node)) return false;
  return isMemberExpressionContainsThis(node.get('object') as NodePath<t.Node>);
}
