import t from '@babel/types';
import reportError from '@shared/reportError';
import uid from '@shared/uid';
import JavaScript from './JavaScript';

class JavaScriptClass extends JavaScript {
  public classIdentifier: t.Identifier;

  private classProperties: Array<[t.Node, t.Expression | null]> = [];
  private classMethods: t.ClassMethod[] = [];
  private superClass: t.Node | null;

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    this.registerTransformClassToFunction();
  }

  public registerTransformClassToFunction() {
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
      ClassMethod: path => {
        this.classMethods.push(path.node);

        return;
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
    return this.classMethods.filter(
      method => !t.isClassMethod(method, { static: true })
    );
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
      t.blockStatement(
        this.buildMultipleConstructorAssignmentExpressionStatement()
      )
    );
  }
}

export default JavaScriptClass;
