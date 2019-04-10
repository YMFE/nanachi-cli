import JavaScriptApp from '@languages/javascript/JavaScriptApp';
import JavaScriptLibrary from '@languages/javascript/JavaScriptLibrary';
import PlainJavaScript from '@languages/javascript/PlainJavaScript';
import WeixinLikePage from '@platforms/WeixinLike/WeixinLikePage';
import FileResource from '@resources/FileResource';
import { ErrorReportableResourceState } from '@resources/Resource';
import WritableResource from '@resources/WritableResource';
import ResolveServices from '@services/ResolveServices';
import reportError from '@shared/reportError';
import path from 'path';

const appEntryFileName = 'app.js';
const sourceCodeDirName = 'source';
const destCodeDirName = 'test';

export const enum Platforms {
  wx = 'wx',
  bu = 'bu',
  quick = 'quick',
  tt = 'tt',
  ali = 'ali'
}

export interface ITranspiler {
  projectRoot: string;
  platform: Platforms;
}

class Transpiler {
  public projectRoot: string;
  public cwd: string = process.cwd();
  public platform: Platforms;
  public resources: Map<string, WritableResource> = new Map();
  public transpilerRoot: string = path.resolve(__dirname, '..');

  private resolveServices: ResolveServices;

  constructor({ projectRoot, platform }: ITranspiler) {
    this.projectRoot = projectRoot;
    this.platform = platform;
    this.resolveServices = new ResolveServices(
      {
        '@react': path.resolve(this.projectSourceDirectory, 'ReactWX.js'),
        '@components': path.resolve(this.projectSourceDirectory, 'components'),
        '@assets': path.resolve(this.projectSourceDirectory, 'assets'),
        '@common': path.resolve(this.projectSourceDirectory, 'common')
      },
      this
    );
  }

  public async process() {
    await this.prepareRegeneratorRuntime();

    const app = new JavaScriptApp({
      rawPath: this.appEntryPath,
      transpiler: this
    });
    this.addResource(this.appEntryPath, app);

    await app.process();

    this.check();
    await this.emit();
  }

  public addResource(rawPath: string, resource: WritableResource) {
    if (this.resources.has(rawPath)) return;
    resource.emit = true;
    resource.emitted = false;
    this.resources.set(rawPath, resource);
    this.emit();
  }

  public async processResource(id: string, location: string) {
    switch (true) {
      case id === '@react':
        const reactLocation = (await this.resolve(
          './ReactWX.js',
          this.projectSourceDirectory
        )).location;
        const reactResource = new JavaScriptLibrary({
          rawPath: reactLocation,
          transpiler: this
        });
        await reactResource.process();

        this.addResource(reactLocation, reactResource);
        break;

      case /\.(s?css|less)$/.test(location):
        const styleResource = new WritableResource({
          rawPath: location,
          transpiler: this
        });

        this.addResource(location, styleResource);
        break;

      case /\.js$/.test(location):
        const resourceConfig = {
          rawPath: location,
          transpiler: this
        };
        const isPageOrClass = this.isPageOrClass(location);
        const scriptResource = isPageOrClass
          ? new WeixinLikePage(resourceConfig)
          : new PlainJavaScript(resourceConfig);

        await scriptResource.process();

        this.addResource(location, scriptResource);
        break;

      default:
        break;
    }
  }

  public get projectSourceDirectory() {
    return path.resolve(this.projectRoot, sourceCodeDirName);
  }

  public get projectDestDirectory() {
    return path.resolve(this.projectRoot, destCodeDirName);
  }

  public get resolve() {
    return this.resolveServices.resolve;
  }

  public get resolveSync() {
    return this.resolveServices.resolveSync;
  }

  private get appEntryPath() {
    return path.resolve(this.projectRoot, sourceCodeDirName, appEntryFileName);
  }

  private async prepareRegeneratorRuntime() {
    const { location } = await this.resolve(
      'regenerator-runtime/runtime.js',
      this.transpilerRoot
    );
    const resource = new JavaScriptLibrary({
      rawPath: location,
      transpiler: this
    });
    await resource.process();
    resource.setCustomDestPath(
      path.resolve(this.projectDestDirectory, 'runtime.js')
    );
    this.addResource(location, resource);
  }

  private async emit() {
    const resourcePool = Array.from(this.resources, ([, resource]) => resource);
    const changedResources = resourcePool.filter(
      resource => resource.emit && !resource.emitted
    );
    const emitPool = changedResources.map(async resource => {
      try {
        await resource.write();
      } catch (error) {
        resource.state = ErrorReportableResourceState.Error;
        resource.error = error;
        reportError(resource);
      }
    });

    await emitPool;
  }

  private isPageOrClass(location: string) {
    const regex = new RegExp(
      `^${this.projectSourceDirectory}/(pages|components)`
    );

    return regex.test(location);
  }

  private hasError() {
    const resourceKeys = Array.from(this.resources.keys());

    return resourceKeys.some(
      resourceKey =>
        (this.resources.get(resourceKey) as FileResource).state ===
        ErrorReportableResourceState.Error
    );
  }

  private check() {
    if (this.hasError()) this.reportError();
  }

  private reportError() {
    this.resources.forEach(reportError);
  }
}

export default Transpiler;
