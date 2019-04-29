// tslint:disable no-var-requires
import SourceCodeResource from '@resources/SourceCodeResource';
import postcss from 'postcss';
import { ResourceState } from '@resources/Resource';
const scss = require('postcss-scss');
const scssPlugin = require('@csstools/postcss-sass');
const postcssImport = require('postcss-import');

class Style extends SourceCodeResource {
  private plugins: Array<postcss.Plugin<postcss.Transformer>> = [];

  public async beforeTranspile() {
    await super.load();
    this.register();
  }

  public async process() {
    await this.beforeTranspile();
    await this.transform();
  }

  private async transform() {
    const result = await postcss(this.plugins).process(this.utf8Content, {
      syntax: scss,
      from: this.rawPath
    });

    this.utf8Content = result.css.toString();
    this.destExt = '.wxss';
    this.state = ResourceState.Emit;
  }

  private register() {
    this.registerAlias();
    this.registerSCSS();
  }

  private registerSCSS() {
    this.plugins.push(scssPlugin);
  }

  private registerAlias() {
    const alias = postcssImport({
      resolve: (importer: string, baseDir: string) => {
        if (!/\.s[ca]ss$/.test(importer)) {
          importer = importer + '.scss';
        }
        return this.transpiler.resolveSync(importer, this.dir).location;
      }
    });
    this.plugins.push(alias);
  }
}

export default Style;
