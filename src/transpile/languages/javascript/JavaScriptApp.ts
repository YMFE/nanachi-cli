import t from '@babel/types';
import { ResourceState } from '@resources/Resource';
import reportError from '@shared/reportError';
import chalk from 'chalk';
import fs from 'fs-extra';
import JavaScriptClass from './JavaScriptClass';

class JavaScriptApp extends JavaScriptClass {
  private imports: t.StringLiteral[] = [];

  public async process() {
    await this.checkAppValid();
    await super.process();
    this.appendAppTransformations();
    await this.applyTransformations();
    await this.waitUntilAsyncProcessesCompleted();
    this.transformConfigToObject();
    this.deriveJSON();
    this.generate();
  }

  public get appJSONString() {
    return JSON.stringify(this.configObject, null, 4);
  }

  private appendAppTransformations() {
    this.appendTransformation(this.registerTransformApp);
    this.appendTransformation(this.injectPages);
    this.appendTransformation(this.processResources);
    this.appendTransformation(this.injectReactLibrary);
  }

  private async checkAppValid() {
    if (await fs.pathExists(this.rawPath)) return;

    this.state = ResourceState.FatalError;
    this.error = new Error(
      chalk`Invalid entry file path ({underline.bold.red ${this.rawPath}})`
    );
    reportError(this);
    this.transpiler.command.exit(-1);
  }

  private async resolveResourceLocation(id: string) {
    try {
      return await this.transpiler.resolve(
        id,
        this.transpiler.projectSourceDirectory
      );
    } catch (error) {
      return this.transpiler.resolve(id, this.transpiler.projectRoot);
    }
  }

  private async processResources() {
    const resourceProcessesPromise = this.imports.map(async node => {
      const id = node.value;

      try {
        const { location } = await this.resolveResourceLocation(id);
        const resource = this.transpiler.spawnResource(location);
        await resource.process();
      } catch (error) {
        this.state = ResourceState.Error;
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
    this.transform({
      ImportDeclaration: path => {
        this.imports.push(path.get('source').node);
        path.remove();
      }
    });
  }
}

export default JavaScriptApp;
