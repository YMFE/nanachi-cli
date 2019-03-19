import JavaScriptApp from '@languages/javascript/JavaScriptApp';
import FileResource from '@resources/FileResource';
import { ErrorReportableResourceState } from '@resources/Resource';
import reportError from '@shared/reportError';
import path from 'path';

const appEntryFileName = 'app.js';
const sourceCodeDirName = 'source';

class Transpiler {
  private projectRoot: string;
  private cwd: string = process.cwd();
  private resources: Map<string, FileResource> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  public async process() {
    const app = new JavaScriptApp({ rawPath: this.appEntryPath });
    this.resources.set(this.appEntryPath, app);
    await app.process();
    this.check();
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
