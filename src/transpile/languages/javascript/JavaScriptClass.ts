import { transformFromAstSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import t from '@babel/types';
import { ErrorReportableResourceState } from '@resources/Resource';
import WritableResource from '@resources/WritableResource';
import generate from '@shared/generate';
import reportError from '@shared/reportError';
import { transformArrowFunctionToBindFunction } from '@shared/transform';
import uid from '@shared/uid';
import { relative } from 'path';
import JavaScript from './JavaScript';

class JavaScriptClass extends JavaScript {
  public classIdentifier: t.Identifier;
  public renderMethod: t.ClassMethod;
  public configObject: any = {};

  private classProperties: Array<[t.Node, t.Expression | null]> = [];
  private classMethods: t.ClassMethod[] = [];
  private superClass: t.Node | null;

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    this.registerTransformClassToFunction();
  }

  public evalObjectSourceCode(sourceCode: string) {
    'use strict';
    // tslint:disable-next-line: no-eval
    return eval(`(${sourceCode})`);
  }

  public transformConfigToObject() {
    if (this.configProperty) {
      const [, property] = this.configProperty;

      if (t.isObjectExpression(property)) {
        this.configObject = {
          ...this.configObject,
          ...this.evalObjectSourceCode(generate(property))
        };
      }
    }
  }

  public deriveJSON() {
    const jsonResource = new WritableResource({
      rawPath: this.pathWithoutExt + '.json',
      transpiler: this.transpiler
    });

    jsonResource.setContent(JSON.stringify(this.configObject, null, 4));

    this.transpiler.addResource(this.pathWithoutExt + '.json', jsonResource);
  }

  public injectReactLibrary() {
    const { location } = this.transpiler.resolveSync('@react', this.dir);
    const relativeReactLibraryPath = relative(this.dir, location);
    const normalizedReactLibraryPath = relativeReactLibraryPath.startsWith('.')
      ? relativeReactLibraryPath
      : `./${relativeReactLibraryPath}`;
    const importNode = t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('React'))],
      t.stringLiteral(normalizedReactLibraryPath)
    );
    this.ast.program.body.unshift(importNode);
  }

  private registerTransformClassToFunction() {
    this.registerTraverseOption({
      ClassDeclaration: {
        enter: path => {
          const id = path.get('id');
          const superClass = path.get('superClass');

          if (t.isIdentifier(id.node)) {
            this.classIdentifier = id.node;
          } else {
            this.error = new Error(
              'Anonymous ClassDeclaration is not allowed in App or Page or Component'
            );
            this.state = ErrorReportableResourceState.Error;
            reportError(this);

            return;
          }

          this.superClass = t.clone(superClass.node!);

          return;
        },
        exit: path => {
          path.replaceWithMultiple([
            this.buildConstructor(),
            this.buildRegisterClass()
          ]);
        }
      },
      ClassProperty: path => {
        const key = path.get('key');
        const value = path.get('value');

        this.classProperties.push([key.node, value.node]);

        return;
      },
      LogicalExpression: path => {
        path.replaceWith(
          t.conditionalExpression(
            path.node.left,
            path.node.right,
            t.nullLiteral()
          )
        );
      },
      ClassMethod: {
        enter: path => {
          this.classMethods.push(path.node);
          this.transformArrayMap(path);
        },
        exit: path => {
          this.transformArrayMap(path);
          this.transformReact(path);
        }
      },
      JSXEmptyExpression: path => {
        path.findParent(t.isJSXExpressionContainer).remove();
      },
      ImportDeclaration: path => {
        this.addExternalResource(path);
      }
    });
  }

  public get configProperty() {
    return this.classProperties
      .filter(([key]) => t.isIdentifier(key, { name: 'config' }))
      .shift();
  }

  private get NonConfigClassProperties() {
    return this.classProperties.filter(
      ([key]) => !t.isIdentifier(key, { name: 'config' })
    );
  }

  private get staticClassMethods() {
    return this.classMethods.filter(method =>
      t.isClassMethod(method, { static: true })
    );
  }

  private get nonStaticClassMethods() {
    return this.classMethods
      .filter(method => !t.isClassMethod(method, { static: true }))
      .filter(({ kind }) => kind !== 'constructor');
  }

  private get registerArguments() {
    const args = [
      this.classIdentifier,
      this.superClass,
      this.buildNonStaticObjectExpression(),
      this.buildStaticObjectExpression()
    ];
    return args.filter(arg => !!arg) as t.Identifier[];
  }

  private get constructorBody() {
    const constructorMethod = this.classMethods.find(node =>
      t.isClassMethod(node, { kind: 'constructor' })
    );

    if (constructorMethod) {
      // constructor.body.body 第一个元素是 super() 调用
      // 需要移除
      (constructorMethod.body as any).body.shift();
      return constructorMethod.body.body;
    }

    return [];
  }

  private addExternalResource(path: NodePath<t.ImportDeclaration>) {
    const { value: id } = path.get('source').node;
    const { location } = this.transpiler.resolveSync(id, this.dir)!;
    path.get('source').node.value = relative(this.dir, location);

    if (this.transpiler.resources.has(location)) return;

    this.transpiler.processResource(id, location);
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

  private transformArrayMapArrowExpression(
    path: NodePath<t.ArrowFunctionExpression>
  ) {
    path.replaceWith(transformArrowFunctionToBindFunction(path.node));

    this.transformArrayMapCallExpression(path.findParent(
      t.isCallExpression
    ) as any);
  }

  private transformReact(path: NodePath<t.ClassMethod>) {
    if (
      path.get('key').isIdentifier({
        name: 'render'
      })
    ) {
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

  private transformArrayMap(path: NodePath<t.ClassMethod>) {
    if (
      path.get('key').isIdentifier({
        name: 'render'
      })
    ) {
      path.traverse({
        CallExpression: callPath => {
          this.transformArrayMapCallExpression(callPath);
        },
        ArrowFunctionExpression: callPath => {
          this.transformArrayMapArrowExpression(callPath);
        }
      });
    }
  }

  private buildClassUid() {
    const id = uid.next();

    return t.objectProperty(t.identifier('classUid'), t.stringLiteral(id));
  }

  private buildRegisterClass() {
    return t.variableDeclarator(
      this.classIdentifier,
      t.callExpression(
        t.memberExpression(t.identifier('React'), t.identifier('toClass')),
        this.registerArguments
      )
    );
  }

  private buildSingleObjectProperties(method: t.ClassMethod) {
    return t.objectProperty(
      method.key,
      t.functionExpression(null, method.params, method.body)
    );
  }

  private buildNonStaticObjectProperties() {
    return this.nonStaticClassMethods.reduce(
      (methods, method) => {
        return [...methods, this.buildSingleObjectProperties(method)];
      },
      [this.buildClassUid()]
    );
  }

  private buildStaticObjectProperties() {
    return this.staticClassMethods.reduce((methods, method) => {
      return [...methods, this.buildSingleObjectProperties(method)];
    }, []);
  }

  private buildNonStaticObjectExpression() {
    return t.objectExpression(this.buildNonStaticObjectProperties());
  }

  private buildStaticObjectExpression() {
    return t.objectExpression(this.buildStaticObjectProperties());
  }

  private buildSingleConstructorAssignmentExpressionStatement(
    key: t.Node,
    right: t.Expression | null
  ) {
    return t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(t.thisExpression(), key),
        right === null ? t.nullLiteral() : right
      )
    );
  }

  private buildMultipleConstructorAssignmentExpressionStatement() {
    return this.NonConfigClassProperties.reduce((statements, [key, right]) => {
      return [
        ...statements,
        this.buildSingleConstructorAssignmentExpressionStatement(key, right)
      ];
    }, []);
  }

  private buildConstructor() {
    return t.functionDeclaration(
      this.classIdentifier,
      [],
      t.blockStatement([
        ...this.buildMultipleConstructorAssignmentExpressionStatement(),
        ...this.constructorBody
      ])
    );
  }
}

export default JavaScriptClass;
