import JavaScriptApp from '@languages/javascript/JavaScriptApp';
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

export interface InterfaceTranspiler {
  projectRoot: string;
  platform: Platforms;
}

class Transpiler {
  public projectRoot: string;
  public cwd: string = process.cwd();
  public platform: Platforms;
  public resources: Map<string, WritableResource> = new Map();

  private resolveServices: ResolveServices;

  constructor({ projectRoot, platform }: InterfaceTranspiler) {
    this.projectRoot = projectRoot;
    this.platform = platform;
    this.resolveServices = new ResolveServices({
      '@react': this.projectSourceDirectory + 'ReactWX.js',
      '@components': path.resolve(this.projectSourceDirectory, 'components'),
      '@assets': path.resolve(this.projectSourceDirectory, 'assets'),
      '@common': path.resolve(this.projectSourceDirectory, 'common')
    });
  }

  public async process() {
    const app = new JavaScriptApp({
      rawPath: this.appEntryPath,
      transpiler: this
    });
    this.resources.set(this.appEntryPath, app);

    await app.process();

    this.check();
    this.resources.forEach(resource => {
      resource.write().then(() => console.log(resource.destPath));
    });
  }

  public async processResource(id: string, location: string) {
    switch (true) {
      case id === '@react':
        const reactLocation = (await this.resolve(
          './ReactWX.js',
          '/Users/roland_reed/Workspace/nanachi-cli/src/runtime'
        )).location;
        const reactResource = new WritableResource({
          rawPath: reactLocation,
          transpiler: this
        });

        reactResource.setCustomDestPath(
          path.resolve(this.projectDestDirectory, 'ReactWX.js')
        );
        this.resources.set(reactLocation, reactResource);
        break;

      case /\.(s?css|less)$/.test(location):
        const styleResource = new WritableResource({
          rawPath: location,
          transpiler: this
        });

        this.resources.set(location, styleResource);
        break;

      case /\.js$/.test(location):
        const scriptResource = new WeixinLikePage({
          rawPath: location,
          transpiler: this
        });

        await scriptResource.process();

        this.resources.set(location, scriptResource);
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
