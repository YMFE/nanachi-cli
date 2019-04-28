import { relative } from 'path';
import JavaScript from './JavaScript';

class PlainJavaScript extends JavaScript {
  private importResourceIds: Set<string> = new Set();

  public async prepare() {
    await super.prepare();
    this.registerPlainJavaScriptTransformations();
  }

  public async process() {
    await super.process();
    await this.prepare();
    await this.importSubModules();
    await this.waitUntilAsyncProcessesCompleted();
  }

  private registerPlainJavaScriptTransformations() {
    this.appendTransformation(this.collectImports);
    this.appendTransformation(this.replaceImports);
  }

  private collectImports() {
    this.transform({
      ImportDeclaration: path => {
        const id = path.node.source.value;
        this.importResourceIds.add(id);
      }
    });
  }

  private async replaceImports() {
    this.transform({
      ImportDeclaration: path => {
        async function replaceImportsAsync() {
          const id = path.node.source.value;
          const { location } = await this.transpiler.resolve(id, this.dir);
          const resource = this.transpiler.resources.get(location);
          const relativePathToSourceRoot = relative(
            this.destDir,
            resource!.destPath
          );
          const normalizedPath = relativePathToSourceRoot.startsWith('.')
            ? relativePathToSourceRoot
            : `./${relativePathToSourceRoot}`;

          path.node.source.value = normalizedPath;
        }

        this.appendAsyncProcess(replaceImportsAsync());
      }
    });
  }

  private async importSubModules() {
    const importsBundle = Array.from(this.importResourceIds).map(async id => {
      const { location } = await this.transpiler.resolve(id, this.dir);

      if (this.transpiler.resources.has(location)) return;

      const resource = this.transpiler.spawnResource(location) as PlainJavaScript;

      await resource.process();
    });

    await Promise.all(importsBundle);
  }
}

export default PlainJavaScript;
