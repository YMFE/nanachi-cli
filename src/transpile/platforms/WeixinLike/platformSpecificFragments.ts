import t from '@babel/types';

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

type TypeAttributeNameFragment = () => t.JSXNamespacedName | t.JSXIdentifier;
type TypeAttributeFragment = () => t.JSXAttribute | null;

interface InterfacePlatformFragment {
  loopAttributeName: TypeAttributeNameFragment;
  loopAttributeItemName: TypeAttributeNameFragment;
  loopAttributeIndexName: TypeAttributeNameFragment;
  loopAttributeKey: TypeAttributeFragment;
}

interface InterfacePlatformFragments {
  [platform: string]: InterfacePlatformFragment;
}

const PlatformFragments: InterfacePlatformFragments = {
  wx: {
    loopAttributeName: wxLoopForAttributeName,
    loopAttributeItemName: wxLoopForItemAttributeName,
    loopAttributeIndexName: wxLoopForIndexAttributeName,
    loopAttributeKey: wxLoopKeyAttribute
  },
  ali: {
    loopAttributeName: aliLoopForAttributeName,
    loopAttributeItemName: aliLoopForItemAttributeName,
    loopAttributeIndexName: aliLoopForIndexAttributeName,
    loopAttributeKey: aliLoopKeyAttribute
  },
  bu: {
    loopAttributeName: buLoopForAttributeName,
    loopAttributeItemName: buLoopForItemAttributeName,
    loopAttributeIndexName: buLoopForIndexAttributeName,
    loopAttributeKey: buLoopKeyAttribute
  }
};

export default PlatformFragments;
