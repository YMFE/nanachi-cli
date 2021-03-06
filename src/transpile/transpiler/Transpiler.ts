import SubCommand from '@commands/SubCommand';
import JavaScript from '@languages/javascript/JavaScript';
import JavaScriptApp from '@languages/javascript/JavaScriptApp';
import PlainJavaScript from '@languages/javascript/PlainJavaScript';
import Style from '@languages/style/Style';
import WeixinLikeComponentOrPage from '@platforms/WeixinLike/WeixinLikeComponentOrPage';
import BinaryResource from '@resources/BinaryResource';
import DuplexResource from '@resources/DuplexResource';
import RemoteResource from '@resources/RemoteResource';
import Resource, { ResourceState } from '@resources/Resource';
import ResolveServices from '@services/ResolveServices';
import reportError from '@shared/reportError';
import path from 'path';
import RuntimeManager from './RuntimeManager';

const appEntryFileName = 'app.js';
const sourceCodeDirName = 'source';
const destCodeDirName = 'test';

export const enum Platforms {
  wx = 'wx',
  bu = 'bu',
  quick = 'quick',
  tt = 'tt',
  ali = 'ali',
  web = 'web'
}

export interface ITranspiler {
  projectRoot: string;
  platform: Platforms;
  command: SubCommand;
}

class Transpiler {
  public projectRoot: string;
  public cwd: string = process.cwd();
  public platform: Platforms;
  public command: SubCommand;
  public resources: Map<string, DuplexResource | BinaryResource> = new Map();
  public transpilerRoot: string = path.resolve(__dirname, '..');

  private resolveServices: ResolveServices;
  private runtimeManager: RuntimeManager;

  constructor({ projectRoot, platform, command }: ITranspiler) {
    this.projectRoot = projectRoot;
    this.platform = platform;
    this.command = command;
    this.resolveServices = new ResolveServices(
      {
        '@components': path.resolve(this.projectSourceDirectory, 'components'),
        '@assets': path.resolve(this.projectSourceDirectory, 'assets'),
        '@common': path.resolve(this.projectSourceDirectory, 'common')
      },
      this
    );
    this.runtimeManager = new RuntimeManager(this);
  }

  public async process() {
    await this.resolveServices.init();
    await this.prepareRegeneratorRuntime();
    await this.prepareRuntime();

    const app = new JavaScriptApp({
      rawPath: this.appEntryPath,
      transpiler: this
    });
    this.addResource(this.appEntryPath, app);

    await app.process();

    this.checkResourcesState();
    await this.emit();
  }

  public addResource(
    rawPath: string,
    resource: DuplexResource | BinaryResource
  ) {
    if (this.resources.has(rawPath)) return;

    this.resources.set(rawPath, resource);
  }

  public spawnResource(location: string) {
    if (this.resources.has(location)) {
      return this.resources.get(location) as
        | JavaScript
        | Style
        | BinaryResource;
    }

    const constructorParam = {
      rawPath: location,
      transpiler: this
    };

    if (/\.(s?css|less)$/.test(location)) {
      const resource = new Style(constructorParam);
      this.addResource(location, resource);
      return resource;
    }

    if (/\.js$/.test(location)) {
      const isPageOrClass = this.isPageOrClass(location);
      const resource = isPageOrClass
        ? new WeixinLikeComponentOrPage(constructorParam)
        : new PlainJavaScript(constructorParam);

      this.addResource(location, resource);
      return resource;
    }

    const binary = new BinaryResource(constructorParam);
    return binary;
  }

  public async processResource(id: string, location: string) {
    switch (true) {
      case /\.(s?css|less)$/.test(location):
        const styleResource = new Style({
          rawPath: location,
          transpiler: this
        });

        await styleResource.process();
        this.addResource(location, styleResource);
        break;

      case /\.js$/.test(location):
        const resourceConfig = {
          rawPath: location,
          transpiler: this
        };
        const isPageOrClass = this.isPageOrClass(location);
        const scriptResource = isPageOrClass
          ? new WeixinLikeComponentOrPage(resourceConfig)
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

  private get appEntryPath() {
    return path.resolve(this.projectRoot, sourceCodeDirName, appEntryFileName);
  }

  private async chooseRuntime() {
    const { remoteRuntime } = this.command.options;

    if (remoteRuntime) {
      const remoteResource = new RemoteResource('', this);
      return remoteResource;
    }

    const { location } = await this.resolve('@react');
    const resource = new BinaryResource({
      rawPath: location,
      transpiler: this
    });
    return resource;
  }

  private async prepareRuntime() {
    const resource = await this.runtimeManager.retrieve();
    await resource.process();
    resource.destPath = path.resolve(this.projectDestDirectory, 'lib/React.js');
    this.addResource(resource.rawPath, resource);
  }

  private async prepareRegeneratorRuntime() {
    const { location } = await this.resolve(
      'regenerator-runtime/runtime.js',
      this.transpilerRoot
    );
    const resource = new BinaryResource({
      rawPath: location,
      transpiler: this
    });
    await resource.process();
    resource.state = ResourceState.Emit;
    resource.destPath = path.resolve(
      this.projectDestDirectory,
      'lib/regenerator.js'
    );
    this.addResource(location, resource);
  }

  private async emit() {
    const resourcePool = Array.from(this.resources, ([, resource]) => resource);
    const changedResources = resourcePool.filter(
      resource => resource.state === ResourceState.Emit
    );
    const emitPool = changedResources.map(async resource => {
      try {
        await resource.write();
      } catch (error) {
        resource.state = ResourceState.Error;
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
        (this.resources.get(resourceKey) as Resource).state ===
        ResourceState.Error
    );
  }

  private checkResourcesState() {
    if (this.hasError()) this.reportError();
  }

  private reportError() {
    this.resources.forEach(reportError);
  }
}

export default Transpiler;
