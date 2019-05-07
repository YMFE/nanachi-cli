import traverse, { TraverseOptions } from '@babel/traverse';
import t from '@babel/types';
import generate from '@shared/generate';
import DerivedCodeResource, { IDerivedResource } from './DerivedCodeResource';
import SourceCodeResource from './SourceCodeResource';

export interface IDerivedJavaScript extends IDerivedResource {
  creator: SourceCodeResource;
}

class DerivedJavaScriptTraversable extends DerivedCodeResource {
  public ast: t.Node;
  private traverseOptions: TraverseOptions = {};

  public setAst(ast: t.Node) {
    this.ast = ast;
  }

  public registerTraverseOption(options: TraverseOptions) {
    this.traverseOptions = { ...this.traverseOptions, ...options };
  }

  public traverse() {
    traverse(this.ast, this.traverseOptions);
  }

  public generate() {
    this.utf8Content = generate(this.ast);
  }
}

export default DerivedJavaScriptTraversable;
