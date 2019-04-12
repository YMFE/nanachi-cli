import { transformFromAstSync } from '@babel/core';
import traverse, { NodePath } from '@babel/traverse';
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
  private constructorParams: any[] = [];
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
    const reactResource = this.transpiler.resources.get(location);
    const destLocation = reactResource!.destPath;
    const relativeReactLibraryPath = relative(this.destDir, destLocation);
    const normalizedReactLibraryPath = relativeReactLibraryPath.startsWith('.')
      ? relativeReactLibraryPath
      : `./${relativeReactLibraryPath}`;
    const importNode = t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('React'))],
      t.stringLiteral(normalizedReactLibraryPath)
    );
    this.ast.program.body.unshift(importNode);
  }

  public buildPageConstructor() {
    return t.functionDeclaration(
      this.classIdentifier,
      this.constructorParams,
      t.blockStatement([...this.constructorBody])
    );
  }

  public buildAppConstructor() {
    return t.functionDeclaration(
      this.classIdentifier,
      this.constructorParams,
      t.blockStatement([
        ...this.buildAppMultipleConstructorAssignmentExpressionStatement(),
        ...this.constructorBody
      ])
    );
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

          this.superClass = superClass.node;

          return;
        },
        exit: path => {
          const constructor = this.isApp
            ? []
            : this.buildPageMultipleConstructorAssignmentExpressionStatement();

          path.replaceWithMultiple([
            this.isApp
              ? this.buildAppConstructor()
              : this.buildPageConstructor(),
            this.buildRegisterClass(),
            ...constructor
          ]);

          traverse(this.ast, {
            ImportDeclaration: importPath => {
              const { specifiers } = importPath.node;

              if (specifiers.length === 0) return;
              if (specifiers.length > 1) return;

              const [specifier] = specifiers;

              if (t.isImportDefaultSpecifier(specifier)) {
                const { local } = specifier;

                if (local.name === 'React') return;
                if (local.name === 'regeneratorRuntime') return;

                if (!t.isIdentifier(this.superClass)) {
                  importPath.remove();
                }
              }
            }
          });
        }
      },
      ClassProperty: path => {
        const key = path.get('key');
        const value = path.get('value');

        this.classProperties.push([key.node, value.node]);

        return;
      },
      ClassMethod: {
        enter: path => {
          const { key, params } = path.node;

          if (t.isIdentifier(key, { name: 'constructor' })) {
            this.constructorParams = params;
          }

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

  private get isApp() {
    return this.rawPath.endsWith('app.js');
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

    switch (id) {
      case 'regenerator-runtime/runtime.js':
        const regeneratorLocation = this.transpiler.resources.get(location)!
          .destPath;
        path.get('source').node.value = relative(
          this.destDir,
          regeneratorLocation
        );
        break;

      case '@react':
        const reactLibraryLocation = this.transpiler.resources.get(location)!
          .destPath;
        path.get('source').node.value = relative(
          this.destDir,
          reactLibraryLocation
        );
        break;

      default:
        path.get('source').node.value = relative(this.dir, location);
        break;
    }

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
        if (!t.isThisExpression(args[0])) {
          args.push(t.thisExpression());
        }
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

  private buildPageSingleConstructorAssignmentExpressionStatement(
    key: t.Node,
    right: t.Expression | null
  ) {
    return t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(this.classIdentifier, key),
        right === null ? t.nullLiteral() : right
      )
    );
  }

  private buildAppSingleConstructorAssignmentExpressionStatement(
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

  private buildPageMultipleConstructorAssignmentExpressionStatement() {
    return this.NonConfigClassProperties.reduce((statements, [key, right]) => {
      return [
        ...statements,
        this.buildPageSingleConstructorAssignmentExpressionStatement(key, right)
      ];
    }, []);
  }

  private buildAppMultipleConstructorAssignmentExpressionStatement() {
    return this.NonConfigClassProperties.reduce((statements, [key, right]) => {
      return [
        ...statements,
        this.buildAppSingleConstructorAssignmentExpressionStatement(key, right)
      ];
    }, []);
  }
}

export default JavaScriptClass;
