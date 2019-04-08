import { transformFromAstSync } from '@babel/core';
import generate from '@babel/generator';
import { parse, ParserOptions } from '@babel/parser';
import traverse, { TraverseOptions } from '@babel/traverse';
import SourceCodeResource from '@resources/SourceCodeResource';

class JavaScript extends SourceCodeResource {
  private parserOptions: ParserOptions;
  private traverseOptions: TraverseOptions = {};

  public async beforeTranspile() {
    await super.load();
    this.initOptions();
    this.parse();
  }

  public registerTraverseOption(options: TraverseOptions) {
    this.traverseOptions = { ...this.traverseOptions, ...options };
  }

  public traverse() {
    traverse(this.ast, this.traverseOptions);
  }

  public generate() {
    const { code } = generate(this.ast);
    this.setContent(code);
    this.emit = true;
    this.emitted = false;
  }

  private initOptions() {
    this.parserOptions = {
      sourceType: 'module',
      sourceFilename: this.rawPath,
      plugins: ['jsx', 'asyncGenerators', 'classProperties', 'objectRestSpread']
    };
  }

  private parse() {
    this.ast = parse(this.sourceCode, this.parserOptions);

    const res = transformFromAstSync(this.ast, undefined, {
      plugins: [require('@babel/plugin-transform-regenerator')],
      ast: true,
      code: false
    });

    this.ast = res!.ast!;
  }
}

export default JavaScript;
