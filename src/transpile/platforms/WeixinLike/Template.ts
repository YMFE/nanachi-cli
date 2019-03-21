import generate from '@babel/generator';
import t from '@babel/types';
import DerivedCodeResource from '@resources/DerivedCodeResource';

interface InterfaceTemplate extends DerivedCodeResource {
  renderMethod: t.ClassMethod;
}

class Template extends DerivedCodeResource {
  public renderMethod: t.ClassMethod;

  constructor({ renderMethod, ...resource }: InterfaceTemplate) {
    super(resource);

    this.renderMethod = renderMethod;
  }

  public get templateLiteral() {
    return generate((this.renderMethod.body as any).body[0].argument).code;
  }
}

export default Template;
