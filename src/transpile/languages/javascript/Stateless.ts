import { transformFromAstSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import t from '@babel/types';
import Template from '@platforms/WeixinLike/Template';
import { transformArrowFunctionToBindFunction } from '@shared/transform';
import uid from '@shared/uid';
import JavaScript from './JavaScript';

class Stateless extends JavaScript {
  private renderMethod: t.FunctionDeclaration;

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    this.registerTransformStateless();
  }

  public async process() {
    await this.beforeTranspile();
    this.register();
    this.traverse();
    this.generate();
    this.deriveTemplate();
  }

  private registerTransformStateless() {
    this.registerTraverseOption({
      FunctionDeclaration: {
        enter: path => {
          const { id } = path.node;

          if (id !== null) {
            const { name } = id;
            const regexStartsWithCapitalizedLetter = /^[A-Z]/;

            if (regexStartsWithCapitalizedLetter.test(name)) {
              this.renderMethod = path.node;
            }
          }
        },
        exit: path => {
          this.transformArrayMap(path);
          this.transformReact(path);
        }
      }
    });
  }

  private transformArrayMap(path: NodePath<t.FunctionDeclaration>) {
    path.traverse({
      CallExpression: callPath => {
        this.transformArrayMapCallExpression(callPath);
      },
      ArrowFunctionExpression: callPath => {
        this.transformArrayMapArrowExpression(callPath);
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

    this.transpiler.addResource(template.rawPath, template);
  }

  private transformArrayMapCallExpression(path: NodePath<t.CallExpression>) {
    const callee = path.get('callee');

    if (t.isMemberExpression(callee.node)) {
      const args = path.node.arguments;

      if (args.length < 2) {
        args.push(t.thisExpression());
      }

      const mapCallback = args[0];

      if (t.isFunctionExpression(mapCallback)) {
        const params = mapCallback.params;

        if (params.length < 2) {
          const indexUid = 'i_' + uid.next();

          this.replaceDataIdInMapCall(path, indexUid);

          params.push(t.identifier(indexUid));
        } else {
          this.replaceDataIdInMapCall(path, (params[1] as t.Identifier).name);
        }
      }
    }
  }

  private replaceDataIdInMapCall(
    path: NodePath<t.CallExpression>,
    indexUid: string
  ) {
    path.traverse({
      JSXAttribute: node => {
        const attributeName = node.get('name');
        const attributeValue = node.get('value');

        if (t.isJSXIdentifier(attributeName.node)) {
          const dataTypeResult = attributeName.node.name.match(
            /^data-([a-z]+)-uid/
          );

          if (dataTypeResult) {
            const [, type] = dataTypeResult;
            if (type !== 'beacon') {
              if (t.isStringLiteral(attributeValue.node)) {
                const id = attributeValue.node.value;

                attributeValue.replaceWith(
                  t.jsxExpressionContainer(
                    t.binaryExpression(
                      '+',
                      t.stringLiteral(id),
                      t.identifier(indexUid)
                    )
                  )
                );
              }
            }
          }
        }
      }
    });
  }

  private transformArrayMapArrowExpression(
    path: NodePath<t.ArrowFunctionExpression>
  ) {
    path.replaceWith(transformArrowFunctionToBindFunction(path.node));

    this.transformArrayMapCallExpression(path.findParent(
      t.isCallExpression
    ) as any);
  }

  private transformReact(path: NodePath<t.FunctionDeclaration>) {
    this.renderMethod = t.cloneDeep(path.node);

    const renderNode = t.program([path.node.body]);

    const result = transformFromAstSync(renderNode, undefined, {
      presets: [[require('@babel/preset-react'), { pragma: 'h' }]],
      ast: true,
      code: false
    });

    const renderRoot = result!.ast!.program.body[0];

    (renderRoot as t.BlockStatement).body.unshift(
      t.variableDeclaration('var', [
        t.variableDeclarator(
          t.identifier('h'),
          t.memberExpression(
            t.identifier('React'),
            t.identifier('createElement')
          )
        )
      ])
    );

    (path.node.body as any) = renderRoot;
  }
}

export default Stateless;
