import JavaScript from './JavaScript';

class PlainJavaScript extends JavaScript {
  public async process() {
    await this.beforeTranspile();

    this.register();

    this.traverse();

    super.generate();
  }

  private register() {
    this.replaceImportSource();
  }

  private replaceImportSource() {
    this.registerTraverseOption({
      ImportDeclaration: path => {
        console.log(path.node.source.value);
      }
    });
  }
}

export default PlainJavaScript;
