import generate from '@babel/generator';
import t from '@babel/types';
import WeixinLikePage from '@platforms/WeixinLike/WeixinLikePage';
import { ErrorReportableResourceState } from '@resources/Resource';
import WritableResource from '@resources/WritableResource';
import reportError from '@shared/reportError';
import JavaScriptClass from './JavaScriptClass';

class JavaScriptApp extends JavaScriptClass {
  private imports: t.StringLiteral[] = [];
  private configObject: { [property: string]: any };

  public async process() {
    this.reset();

    await this.beforeTranspile();

    this.register();

    this.traverse();

    await this.processResources();

    super.generate();

    this.transformConfigToObject();

    this.injectPages();

    this.deriveJSON();
  }

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    super.register();
    this.registerTransformApp();
  }

  public get appJSONString() {
    return JSON.stringify(this.configObject, null, 4);
  }

  private reset() {
    this.state = ErrorReportableResourceState.Ready;
    this.error = '';
  }

  private async processResources() {
    const resourceProcessesPromise = this.imports.map(async node => {
      const id = node.value;

      try {
        const { location } = await this.transpiler.resolve(
          id,
          this.transpiler.projectSourceDirectory
        );

        await this.processWithProperClass(id, location);
      } catch (error) {
        this.state = ErrorReportableResourceState.Error;
        this.error = error;
        reportError(this);
      }
    });

    await Promise.all(resourceProcessesPromise);
  }

  private async processWithProperClass(id: string, location: string) {
    switch (true) {
      case id === '@react':
        const reactResource = new WritableResource({
          rawPath: '/Users/roland_reed/Workspace/aaaa/source/ReactWX.js',
          transpiler: this.transpiler
        });

        this.transpiler.resources.set(
          '/Users/roland_reed/Workspace/aaaa/source/ReactWX.js',
          reactResource
        );
        break;

      case /\.(s?css|less)$/.test(location):
        const styleResource = new WritableResource({
          rawPath: location,
          transpiler: this.transpiler
        });

        this.transpiler.resources.set(location, styleResource);
        break;

      case /\.js$/.test(location):
        const scriptResource = new WeixinLikePage({
          rawPath: location,
          transpiler: this.transpiler
        });

        await scriptResource.process();

        this.transpiler.resources.set(location, scriptResource);
        break;

      default:
        break;
    }
  }

  private get pages() {
    return this.imports.filter(({ value }) => /^(\.\/)?pages/.test(value));
  }

  private deriveJSON() {
    const jsonResource = new WritableResource({
      rawPath: this.pathWithoutExt + '.json',
      transpiler: this.transpiler
    });

    jsonResource.setContent(JSON.stringify(this.configObject, null, 4));

    this.transpiler.resources.set(this.pathWithoutExt + '.json', jsonResource);
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
        path.remove();
      }
    });
  }
}

export default JavaScriptApp;
