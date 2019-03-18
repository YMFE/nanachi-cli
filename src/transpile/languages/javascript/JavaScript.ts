import generate from '@babel/generator';
import { parse, ParserOptions } from '@babel/parser';
import traverse, { TraverseOptions } from '@babel/traverse';
import SourceCodeResource from '@resources/SourceCodeResource';

class JavaScript extends SourceCodeResource {
  private parserOptions: ParserOptions;
  private traverseOptions: TraverseOptions = {};

  public registerTraverseOption(options: TraverseOptions) {
    this.traverseOptions = { ...this.traverseOptions, ...options };
  }

  public initOptions() {
    this.parserOptions = {
      sourceType: 'module',
      sourceFilename: this.rawPath,
      plugins: ['jsx', 'asyncGenerators', 'classProperties', 'objectRestSpread']
    };
  }

  public parse() {
    this.ast = parse(this.sourceCode, this.parserOptions);
  }

  public traverse() {
    traverse(this.ast, this.traverseOptions);
  }

  public generate() {
    const { code } = generate(this.ast);
    this.setContent(code);
  }
}

export default JavaScript;
