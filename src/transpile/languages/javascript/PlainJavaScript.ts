import { relative } from 'path';
import JavaScript from './JavaScript';

class PlainJavaScript extends JavaScript {
  private importResourceIds: Set<string> = new Set();

  public async process() {
    await this.beforeTranspile();

    this.collectImports();
    this.traverse();
    await this.addImports();

    this.resetTraverseOptions();
    this.replaceImports();
    this.traverse();

    super.generate();
  }

  private collectImports() {
    this.registerTraverseOption({
      ImportDeclaration: path => {
        const id = path.node.source.value;
        this.importResourceIds.add(id);
      }
    });
  }

  private replaceImports() {
    this.registerTraverseOption({
      ImportDeclaration: path => {
        const id = path.node.source.value;
        const location = this.transpiler.resolveSync(id, this.dir).location;
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
    });
  }

  private async addImports() {
    const importsBundle = Array.from(this.importResourceIds).map(async id => {
      const { location } = await this.transpiler.resolve(id, this.dir);

      if (this.transpiler.resources.has(location)) return;

      const resource = new PlainJavaScript({
        rawPath: location,
        transpiler: this.transpiler
      });

      await resource.process();

      this.transpiler.addResource(location, resource);
    });

    await Promise.all(importsBundle);
  }
}

export default PlainJavaScript;
