import t from '@babel/types';

function wxIdentifier() {
  return t.stringLiteral('wx');
}

function aliIdentifier() {
  return t.stringLiteral('ali');
}

function buIdentifier() {
  return t.stringLiteral('bu');
}

function wxIfAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('wx'), t.jsxIdentifier('if'));
}

function aliIfAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('a'), t.jsxIdentifier('if'));
}

function buIfAttributeName() {
  return t.jsxIdentifier('s-if');
}

function wxElseIfAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('wx'), t.jsxIdentifier('elif'));
}

function aliElseIfAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('a'), t.jsxIdentifier('elif'));
}

function buElseIfAttributeName() {
  return t.jsxIdentifier('s-elif');
}

function wxElseAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('wx'), t.jsxIdentifier('else'));
}

function aliElseAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('a'), t.jsxIdentifier('else'));
}

function buElseAttributeName() {
  return t.jsxIdentifier('s-else');
}

function wxLoopForAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('wx'), t.jsxIdentifier('for'));
}

function aliLoopForAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('a'), t.jsxIdentifier('for'));
}

function buLoopForAttributeName() {
  return t.jsxIdentifier('s-for');
}

function wxLoopForItemAttributeName() {
  return t.jsxNamespacedName(
    t.jsxIdentifier('wx'),
    t.jsxIdentifier('for-item')
  );
}

function aliLoopForItemAttributeName() {
  return t.jsxNamespacedName(t.jsxIdentifier('a'), t.jsxIdentifier('for-item'));
}

function buLoopForItemAttributeName() {
  return t.jsxIdentifier('s-for-item');
}

function wxLoopForIndexAttributeName() {
  return t.jsxNamespacedName(
    t.jsxIdentifier('wx'),
    t.jsxIdentifier('for-index')
  );
}

function aliLoopForIndexAttributeName() {
  return t.jsxNamespacedName(
    t.jsxIdentifier('a'),
    t.jsxIdentifier('for-index')
  );
}

function buLoopForIndexAttributeName() {
  return t.jsxIdentifier('s-for-index');
}

function wxLoopKeyAttribute() {
  return t.jsxAttribute(
    t.jsxNamespacedName(t.jsxIdentifier('wx'), t.jsxIdentifier('key')),
    t.stringLiteral('*this')
  );
}

function aliLoopKeyAttribute() {
  return t.jsxAttribute(
    t.jsxNamespacedName(t.jsxIdentifier('a'), t.jsxIdentifier('key')),
    t.stringLiteral('*this')
  );
}

function buLoopKeyAttribute() {
  return null;
}

type TypeIdentifier = () => t.StringLiteral;
type TypeAttributeNameFragment = () => t.JSXNamespacedName | t.JSXIdentifier;
type TypeAttributeFragment = () => t.JSXAttribute | null;

interface IPlatformFragment {
  loopAttributeName: TypeAttributeNameFragment;
  loopAttributeItemName: TypeAttributeNameFragment;
  loopAttributeIndexName: TypeAttributeNameFragment;
  loopAttributeKey: TypeAttributeFragment;
  ifAttributeName: TypeAttributeNameFragment;
  elseIfAttributeName: TypeAttributeNameFragment;
  elseAttributeName: TypeAttributeNameFragment;
  id: TypeIdentifier;
}

interface IPlatformFragments {
  [platform: string]: IPlatformFragment;
}

const PlatformFragments: IPlatformFragments = {
  wx: {
    loopAttributeName: wxLoopForAttributeName,
    loopAttributeItemName: wxLoopForItemAttributeName,
    loopAttributeIndexName: wxLoopForIndexAttributeName,
    loopAttributeKey: wxLoopKeyAttribute,
    ifAttributeName: wxIfAttributeName,
    elseIfAttributeName: wxElseIfAttributeName,
    elseAttributeName: wxElseAttributeName,
    id: wxIdentifier
  },
  ali: {
    loopAttributeName: aliLoopForAttributeName,
    loopAttributeItemName: aliLoopForItemAttributeName,
    loopAttributeIndexName: aliLoopForIndexAttributeName,
    loopAttributeKey: aliLoopKeyAttribute,
    ifAttributeName: aliIfAttributeName,
    elseIfAttributeName: aliElseIfAttributeName,
    elseAttributeName: aliElseAttributeName,
    id: aliIdentifier
  },
  bu: {
    loopAttributeName: buLoopForAttributeName,
    loopAttributeItemName: buLoopForItemAttributeName,
    loopAttributeIndexName: buLoopForIndexAttributeName,
    loopAttributeKey: buLoopKeyAttribute,
    ifAttributeName: buIfAttributeName,
    elseIfAttributeName: buElseIfAttributeName,
    elseAttributeName: buElseAttributeName,
    id: buIdentifier
  }
};

export default PlatformFragments;
