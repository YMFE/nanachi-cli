import generate from '@babel/generator';
import t from '@babel/types';
import JavaScriptClass from './JavaScriptClass';

class JavaScriptApp extends JavaScriptClass {
  private imports: t.StringLiteral[] = [];
  private configObject: { [property: string]: any };

  public async process() {
    await super.load();
    super.beforeTranspile();
    super.registerTransformClassToFunction();
    this.registerTransformApp();
    this.traverse();
    super.generate();
    this.transformConfigToObject();
    this.injectPages();
  }

  public get appJSONString() {
    return JSON.stringify(this.configObject, null, 4);
  }

  private get pages() {
    return this.imports.filter(({ value }) => /^(\.\/)?pages/.test(value));
  }

  private evalObjectSourceCode(sourceCode: string) {
    'use strict';
    // tslint:disable-next-line: no-eval
    return eval(`(${sourceCode})`);
  }

  private transformConfigToObject() {
    let config = {};

    if (this.configProperty) {
      const [, property] = this.configProperty;

      if (t.isObjectExpression(property)) {
        config = this.evalObjectSourceCode(generate(property).code);
      }
    }

    this.configObject = config;
  }

  private injectPages() {
    const pagesPaths = this.pages.map(({ value }) =>
      value.replace(/^(\.\/)?/, '')
    );
    this.configObject.pages = pagesPaths;
  }

  private registerTransformApp() {
    this.registerTraverseOption({
      ImportDeclaration: path => {
        this.imports.push(path.get('source').node);
      }
    });
  }
}

export default JavaScriptApp;
