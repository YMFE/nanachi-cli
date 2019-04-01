import t from '@babel/types';
import Template from '@platforms/WeixinLike/Template';
import JavaScript from './JavaScript';

class Stateless extends JavaScript {
  private renderMethod: t.FunctionDeclaration;

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    this.registerTransformStateless();
  }

  public async process() {
    await this.beforeTranspile();
    this.register();
    this.traverse();
    this.deriveTemplate();
  }

  private registerTransformStateless() {
    this.registerTraverseOption({
      FunctionDeclaration: path => {
        const { id } = path.node;

        if (id !== null) {
          const { name } = id;
          const regexStartsWithCapitalizedLetter = /^[A-Z]/;

          if (regexStartsWithCapitalizedLetter.test(name)) {
            this.renderMethod = path.node;
          }
        }
      }
    });
  }

  private deriveTemplate() {
    const template = new Template({
      renderMethod: this.renderMethod,
      creator: this,
      rawPath: this.pathWithoutExt + '.wxml',
      transpiler: this.transpiler
    });

    template.process();

    this.transpiler.addResource(template.rawPath, template);
  }
}

export default Stateless;
