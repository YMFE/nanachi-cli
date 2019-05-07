// tslint:disable no-var-requires
import platformExtensions from '@platforms/WeixinLike/platformSpecificExtensions';
import { ResourceState } from '@resources/Resource';
import SourceCodeResource from '@resources/SourceCodeResource';
import postcss from 'postcss';
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
    this.destExt = platformExtensions[this.platform].style;
    this.state = ResourceState.Emit;
  }

  private async register() {
    this.registerAlias();
    this.registerSCSS();
  }

  private registerSCSS() {
    this.plugins.push(scssPlugin);
  }

  private registerAlias() {
    const alias = postcssImport({
      resolve: async (importer: string, baseDir: string) => {
        if (!/\.s[ca]ss$/.test(importer)) {
          importer =
            importer + platformExtensions[this.platform].style;
        }
        const { location } = await this.resolve(importer, this.dir);
        return location;
      }
    });
    this.plugins.push(alias);
  }
}

export default Style;
