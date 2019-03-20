import JavaScriptApp from '@languages/javascript/JavaScriptApp';
import JavaScriptComponent from '@languages/javascript/JavaScriptComponent';
import JavaScriptPage from '@languages/javascript/JavaScriptPage';
import WeixinLikePage from '@platforms/WeixinLike/WeixinLikePage';
import FileResource from '@resources/FileResource';
import { ErrorReportableResourceState } from '@resources/Resource';
import reportError from '@shared/reportError';
import path from 'path';

const appEntryFileName = 'app.js';
const sourceCodeDirName = 'source';
const pagePath = 'pages/index/index.js';
const componentPath = 'components/Animal/index.js';

class Transpiler {
  public projectRoot: string;
  public cwd: string = process.cwd();

  private resources: Map<string, FileResource> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  public async process() {
    const app = new WeixinLikePage({
      rawPath: this.appEntryPath,
      transpiler: this
    });
    this.resources.set(this.appEntryPath, app);
    await app.process();
    this.check();
  }

  public get projectSourceDirectory() {
    return path.resolve(this.projectRoot, sourceCodeDirName);
  }

  private get appEntryPath() {
    return path.resolve(this.projectRoot, sourceCodeDirName, pagePath);
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
