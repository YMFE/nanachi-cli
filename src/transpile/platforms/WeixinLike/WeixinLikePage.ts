import t from '@babel/types';
import JavaScriptPage from '@languages/javascript/JavaScriptPage';

class WeixinLikePage extends JavaScriptPage {
  public async process() {
    await this.beforeTranspile();

    this.register();

    super.traverse();

    this.generate();
  }

  public async beforeTranspile() {
    await super.beforeTranspile();
  }

  public register() {
    super.register();
    this.registerAttrName();
  }

  private registerAttrName() {
    this.registerTraverseOption({
      JSXAttribute: path => {
        const { node } = path.get('name');

        if (t.isJSXIdentifier(node)) {
          switch (true) {
            case node.name === 'className':
              node.name = 'class';
              break;

            case /^catch[A-Z]/.test(node.name):
              node.name = `catch${node.name.slice(5).toLocaleLowerCase()}`;
              path.get('value').replaceWith(t.stringLiteral('dispatchEvent'));
              break;

            case /^on[A-Z]/.test(node.name):
              node.name = `bind${node.name.slice(2).toLocaleLowerCase()}`;
              path.get('value').replaceWith(t.stringLiteral('dispatchEvent'));

            default:
              break;
          }
        }
      }
    });
  }
}

export default WeixinLikePage;
