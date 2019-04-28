import DuplexResource, { IDuplexResource } from './DuplexResource';
import Resource from './Resource';

export interface IDerivedResource extends IDuplexResource {
  creator: Resource;
}

class DerivedCodeResource extends DuplexResource {
  public creator: Resource;

  constructor({ creator, ...resource }: IDerivedResource) {
    super(resource);

    this.creator = creator;
  }

  public get rootCreator(): Resource {
    if (this.creator instanceof DerivedCodeResource) {
      return this.creator.rootCreator;
    }
    return this.creator;
  }
}

export default DerivedCodeResource;
