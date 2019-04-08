import generate from '@babel/generator';
import traverse, { TraverseOptions } from '@babel/traverse';
import t from '@babel/types';
import DerivedCodeResource, {
  IDerivedResource
} from './DerivedCodeResource';
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
    const { code } = generate(this.ast);
    this.setContent(code);
  }
}

export default DerivedJavaScriptTraversable;
