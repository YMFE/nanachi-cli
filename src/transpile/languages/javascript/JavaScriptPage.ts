import t from '@babel/types';
import { relative } from 'path';
import JavaScriptClass from './JavaScriptClass';

class JavaScriptPage extends JavaScriptClass {
  public async process() {
    await super.load();
    super.beforeTranspile();
    super.registerTransformClassToFunction();
    this.registerNativePage();
    this.traverse();
    super.generate();
  }

  private get relativePagePath() {
    return relative(this.transpiler.projectSourceDirectory, this.rawPath);
  }

  private registerNativePage() {
    this.registerTraverseOption({
      ExportDefaultDeclaration: path => {
        path.insertBefore(
          t.expressionStatement(
            t.callExpression(t.identifier('Page'), [
              t.callExpression(
                t.memberExpression(
                  t.identifier('React'),
                  t.identifier('registerPage')
                ),
                [this.classIdentifier, t.stringLiteral(this.relativePagePath)]
              )
            ])
          )
        );
      }
    });
  }
}

export default JavaScriptPage;
