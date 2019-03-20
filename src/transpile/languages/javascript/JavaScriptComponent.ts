import t from '@babel/types';
import JavaScriptClass from './JavaScriptClass';

class JavaScriptComponent extends JavaScriptClass {
  public register() {
    super.register();
    this.registerNativePage();
  }

  private get className() {
    return this.classIdentifier.name;
  }

  private registerNativePage() {
    this.registerTraverseOption({
      ExportDefaultDeclaration: path => {
        path.insertBefore(
          t.expressionStatement(
            t.callExpression(t.identifier('Component'), [
              t.callExpression(
                t.memberExpression(
                  t.identifier('React'),
                  t.identifier('registerComponent')
                ),
                [this.classIdentifier, t.stringLiteral(this.className)]
              )
            ])
          )
        );
      }
    });
  }
}

export default JavaScriptComponent;
