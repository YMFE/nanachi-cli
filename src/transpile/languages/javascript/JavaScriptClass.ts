import { transformFromAstSync } from '@babel/core';
import { NodePath, TraverseOptions } from '@babel/traverse';
import t from '@babel/types';
import DuplexResource from '@resources/DuplexResource';
import { ResourceState } from '@resources/Resource';
import generate from '@shared/generate';
import reportError from '@shared/reportError';
import { arrowFunctionToBindFunction } from '@shared/transform';
import uid from '@shared/uid';
import { relative } from 'path';
import JavaScript from './JavaScript';

const enum classType {
  state = 'state',
  stateless = 'stateless'
}

class JavaScriptClass extends JavaScript {
  protected renderMethod: t.ClassMethod | t.FunctionDeclaration;
  protected classIdentifier: t.Identifier;
  protected configObject: any = {};
  protected superClass: t.Node | null;

  private classProperties: Array<[t.Node, t.Expression | null]> = [];
  private constructorParams: any[] = [];
  private classMethods: t.ClassMethod[] = [];
  private classType: classType = classType.stateless;

  public async process() {
    await super.process();
    this.appendClassTransformations();
    await this.applyTransformations();
    await this.waitUntilAsyncProcessesCompleted();
  }

  protected evalObjectSourceCode(sourceCode: string) {
    'use strict';
    // tslint:disable-next-line: no-eval
    return eval(`(${sourceCode})`);
  }

  protected transformConfigToObject() {
    if (this.configProperty) {
      const [, property] = this.configProperty;

      if (t.isObjectExpression(property)) {
        this.configObject = {
          ...this.configObject,
          ...this.colorCoercion(this.evalObjectSourceCode(generate(property)))
        };
      }
    }
  }

  protected deriveJSON() {
    const jsonResource = new DuplexResource({
      rawPath: this.pathWithoutExt + '.json',
      transpiler: this.transpiler
    });

    jsonResource.utf8Content = JSON.stringify(this.configObject, null, 4);
    jsonResource.state = ResourceState.Emit;

    this.transpiler.addResource(this.pathWithoutExt + '.json', jsonResource);
  }

  protected injectReactLibrary() {
    const inject = async () => {
      const { location } = await this.resolve('@react');
      const reactResource = this.transpiler.resources.get(location);
      const destLocation = reactResource!.destPath;
      const relativeReactLibraryPath = relative(this.destDir, destLocation);
      const normalizedReactLibraryPath = relativeReactLibraryPath.startsWith(
        '.'
      )
        ? relativeReactLibraryPath
        : `./${relativeReactLibraryPath}`;
      const importNode = t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier('React'))],
        t.stringLiteral(normalizedReactLibraryPath)
      );
      this.ast.program.body.unshift(importNode);
    };

    this.appendAsyncProcess(inject());
  }

  protected transformStateJSXToReact() {
    this.transform({
      ClassMethod: path => {
        if (
          path.get('key').isIdentifier({
            name: 'render'
          })
        ) {
          this.transformReact(path);
        }
      },
      FunctionDeclaration: path => {
        if (this.classType === classType.stateless) {
          this.transformReact(path);
        }
      }
    });
  }

  protected replaceClassDeclaration() {
    this.transform({
      ClassDeclaration: path => {
        const constructor = this.isApp
          ? []
          : this.buildPageMultipleConstructorAssignmentExpressionStatement();

        path.replaceWithMultiple([
          this.isApp ? this.buildAppConstructor() : this.buildPageConstructor(),
          this.buildRegisterClass(),
          ...constructor
        ]);
      }
    });
  }

  protected transformMapCall() {
    this.transform({
      ClassMethod: path => {
        if (
          path.get('key').isIdentifier({
            name: 'render'
          })
        ) {
          this.transformArrayMap(path);
        }
      },
      FunctionDeclaration: path => {
        const { id } = path.node;

        if (t.isIdentifier(id)) {
          if (this.classIdentifier.name === id.name) {
            this.transformArrayMap(path);
          }
        }
      }
    });
  }

  public get configProperty() {
    return this.classProperties
      .filter(([key]) => t.isIdentifier(key, { name: 'config' }))
      .shift();
  }

  private colorCoercion(config: any): any {
    if (config.window) {
      return { ...config, window: this.colorCoercion(config.window) };
    }

    const objContainsTheKeyAndValueIsOneOf = (
      obj: any,
      key: string,
      values: string[]
    ) => values.some(v => obj[key] === v);

    const NAVIGATION_BAR_TEXT_KEY = 'navigationBarTextStyle';
    const BACKGROUND_TEXT_STYLE_KEY = 'backgroundTextStyle';
    const lightValues = ['#fff', '#ffffff', 'white'];

    if (config[NAVIGATION_BAR_TEXT_KEY]) {
      config[NAVIGATION_BAR_TEXT_KEY] = objContainsTheKeyAndValueIsOneOf(
        config,
        NAVIGATION_BAR_TEXT_KEY,
        lightValues
      )
        ? 'white'
        : 'black';
    }

    if (config[BACKGROUND_TEXT_STYLE_KEY]) {
      config[BACKGROUND_TEXT_STYLE_KEY] = objContainsTheKeyAndValueIsOneOf(
        config,
        BACKGROUND_TEXT_STYLE_KEY,
        [...lightValues, 'light']
      )
        ? 'light'
        : 'dark';
    }

    return config;
  }

  private buildPageConstructor() {
    return t.functionDeclaration(
      this.classIdentifier,
      this.constructorParams,
      t.blockStatement([...this.constructorBody])
    );
  }

  private buildAppConstructor() {
    return t.functionDeclaration(
      this.classIdentifier,
      this.constructorParams,
      t.blockStatement([
        ...this.buildAppMultipleConstructorAssignmentExpressionStatement(),
        ...this.constructorBody
      ])
    );
  }

  private replaceStateless() {
    this.transform({
      FunctionDeclaration: path => {
        const { id } = path.node;

        if (id !== null) {
          const { name } = id;
          const regexStartsWithCapitalizedLetter = /^[A-Z]/;

          if (regexStartsWithCapitalizedLetter.test(name)) {
            this.classIdentifier = t.identifier(name);
            this.transformArrayMap(path);
          }
        }
      }
    });
  }

  private transformState() {
    this.appendTransformation(this.collectAndClean);
  }

  private transformStateless() {
    this.appendTransformation(this.collectAndClean);
    this.appendTransformation(this.replaceStateless);
  }

  private visitorsOfRemoveJSXEmptyExpression(): TraverseOptions {
    return {
      JSXEmptyExpression: path => {
        path.findParent(t.isJSXExpressionContainer).remove();
      }
    };
  }

  private visitorsOfCollectPropertyAndMethods(): TraverseOptions {
    return {
      ClassProperty: path => {
        const key = path.get('key');
        const value = path.get('value');

        this.classProperties.push([key.node, value.node]);
      },
      ClassMethod: path => {
        const { key, params } = path.node;

        if (t.isIdentifier(key, { name: 'constructor' })) {
          this.constructorParams = params;
        }

        this.classMethods.push(path.node);
      }
    };
  }

  private collectAndClean() {
    const visitors = {
      ...this.visitorsOfCollectPropertyAndMethods(),
      ...this.visitorsOfRemoveJSXEmptyExpression()
    };

    this.transform(visitors);
  }

  private identifyClassType() {
    this.transform({
      ClassDeclaration: path => {
        const id = path.get('id');
        const superClass = path.get('superClass');

        if (t.isIdentifier(id.node)) {
          this.classIdentifier = id.node;
        } else {
          this.error = new Error(
            'Anonymous ClassDeclaration is not allowed in App or Page or Component'
          );
          this.state = ResourceState.Error;
          reportError(this);
        }

        this.superClass = superClass.node;
        this.classType = classType.state;

        path.stop();
      }
    });
  }

  private transformAccordingToClassType() {
    if (this.classType === classType.state) {
      this.transformState();
    } else {
      this.transformStateless();
    }
  }

  private appendClassTransformations() {
    this.appendTransformation(this.identifyClassType);
    this.appendTransformation(this.transformAccordingToClassType);
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

        if (params.length === 0) {
          params.push(t.identifier(uid.next()));
        }

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
    path.replaceWith(arrowFunctionToBindFunction(path.node));

    this.transformArrayMapCallExpression(path.findParent(
      t.isCallExpression
    ) as any);
  }

  private transformReact(
    path: NodePath<t.ClassMethod | t.FunctionDeclaration>
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

  private transformArrayMap(
    path: NodePath<t.ClassMethod | t.FunctionDeclaration>
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
