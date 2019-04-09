import t from '@babel/types';
import { ErrorReportableResourceState } from '@resources/Resource';
import reportError from '@shared/reportError';
import { relative } from 'path';
import JavaScriptClass from './JavaScriptClass';

class JavaScriptApp extends JavaScriptClass {
  private imports: t.StringLiteral[] = [];

  public async process() {
    this.reset();

    await this.beforeTranspile();

    this.register();

    this.traverse();

    await this.processResources();

    this.injectReactLibrary();

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

        await this.transpiler.processResource(id, location);
      } catch (error) {
        this.state = ErrorReportableResourceState.Error;
        this.error = error;
        reportError(this);
      }
    });

    await Promise.all(resourceProcessesPromise);
  }

  private get pages() {
    return this.imports.filter(({ value }) => /^(\.\/)?pages/.test(value));
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
