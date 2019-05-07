import { relative } from 'path';
import JavaScript from './JavaScript';

class PlainJavaScript extends JavaScript {
  private importResourceIds: Set<string> = new Set();

  public async process() {
    await super.process();
    this.collectImports();
    await this.importSubModules();
    await this.waitUntilAsyncProcessesCompleted();
    this.applyTransformations();
    this.generate();
  }

  private collectImports() {
    this.transform({
      ImportDeclaration: path => {
        const id = path.node.source.value;
        const replace = async () => {
          const { location } = await this.resolve(id, this.dir);
          const resource = this.transpiler.spawnResource(location);
          await resource.process();
          const relativePathToSourceRoot = relative(
            this.destDir,
            resource!.destPath
          );
          const normalizedPath = relativePathToSourceRoot.startsWith('.')
            ? relativePathToSourceRoot
            : `./${relativePathToSourceRoot}`;

          path.node.source.value = normalizedPath;
        };
        this.appendAsyncProcess(replace());
      }
    });
  }

  private async importSubModules() {
    const importsBundle = Array.from(this.importResourceIds).map(async id => {
      const { location } = await this.resolve(id, this.dir);

      if (this.transpiler.resources.has(location)) return;

      const resource = this.transpiler.spawnResource(
        location
      ) as PlainJavaScript;

      await resource.process();
    });

    await Promise.all(importsBundle);
  }
}

export default PlainJavaScript;
