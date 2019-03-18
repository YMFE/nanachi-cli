import JavaScriptApp from '@languages/javascript/JavaScriptApp';
import ReadableResource, {
  ErrorReportableResourceState
} from '@resources/ReadableResource';
import WritableResource from '@resources/WritableResource';
import { log, stop } from '@shared/spinner';
import chalk from 'chalk';
import path from 'path';

const appEntryFileName = 'app.js';
const sourceCodeDirName = 'source';

type TypeErrorReportable = ReadableResource | WritableResource;

class Transpiler {
  private projectRoot: string;
  private cwd: string = process.cwd();
  private resources: Map<string, TypeErrorReportable> = new Map();

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
        (this.resources.get(resourceKey) as TypeErrorReportable).state ===
        ErrorReportableResourceState.Error
    );
  }

  private check() {
    if (this.hasError()) this.reportError();
  }

  private reportError() {
    this.resources.forEach(resource => {
      if (resource.state === ErrorReportableResourceState.Error) {
        const error = resource.error.toString();

        log(chalk`{red.bold CompileError:}`);
        log(
          chalk`  {bold.dim SourceFilePath:} {bold.underline ${resource.rawPath}}`
        );
        stop(chalk`  {bold.dim ErrorMessage:} {bold ${error}}`);
      }
    });
  }
}

export default Transpiler;
