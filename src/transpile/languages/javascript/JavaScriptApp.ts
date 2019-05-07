import BinaryResource from '@resources/BinaryResource';
import { ResourceState } from '@resources/Resource';
import reportError from '@shared/reportError';
import chalk from 'chalk';
import fs from 'fs-extra';
import JavaScriptClass from './JavaScriptClass';

class JavaScriptApp extends JavaScriptClass {
  private imports: string[] = [];

  public async process() {
    await this.checkAppValid();
    await super.process();
    this.appendAppTransformations();
    await this.applyTransformations();
    await this.waitUntilAsyncProcessesCompleted();
    this.transformConfigToObject();
    this.deriveJSON();
    await this.importTabResources();
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

  private async importTabResources() {
    const { tabBar } = this.configObject;
    const list = tabBar[`${this.platform}List`] || tabBar.list || [];

    if (tabBar) {
      const iconPaths = list.reduce(
        (paths: string[], page: any) => [...paths, page.iconPath],
        []
      );
      const selectedIconPaths = list.reduce(
        (paths: string[], page: any) => [...paths, page.selectedIconPath],
        []
      );
      const allIcons = [...iconPaths, ...selectedIconPaths].map(
        (id: string) => {
          if (id.startsWith('/')) return `.${id}`;
          if (!id.startsWith('.')) return `./${id}`;
          return id;
        }
      );

      const iconResources = allIcons.map(async iconPath => {
        try {
          const { location } = await this.resolve(
            iconPath,
            this.dir
          );
          const resource = new BinaryResource({
            rawPath: location,
            transpiler: this.transpiler
          });
          this.transpiler.addResource(location, resource);
          return resource.process();
        } catch (error) {
          this.state = ResourceState.Error;
          this.error = error;
          reportError(this);
        }
      });

      return Promise.all(iconResources);
    }
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
      return await this.resolve(
        id,
        this.transpiler.projectSourceDirectory
      );
    } catch (error) {
      return this.resolve(id, this.transpiler.projectRoot);
    }
  }

  private async processResources() {
    const resourceProcessesPromise = this.imports.map(async id => {
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
    return this.imports.filter(id => /^(\.\/)?pages/.test(id));
  }

  private injectPages() {
    const pagesPaths = this.pages.map(id => id.replace(/^(\.\/)?/, ''));
    this.configObject.pages = pagesPaths;
  }

  private registerTransformApp() {
    this.transform({
      ImportDeclaration: path => {
        const id = path.get('source').node.value;
        this.imports.push(id);
        if (
          id.includes('pages') ||
          id.endsWith('.scss') ||
          id.endsWith('.less') ||
          id.endsWith('@react')
        ) {
          path.remove();
        }
      }
    });
  }
}

export default JavaScriptApp;
