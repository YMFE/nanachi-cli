import DuplexResource, { IWritableResource } from './DuplexResource';
import SourceCodeResource from './SourceCodeResource';

export interface IDerivedResource extends IWritableResource {
  creator: SourceCodeResource;
}

class DerivedCodeResource extends DuplexResource {
  public creator: SourceCodeResource;

  constructor({ creator, ...resource }: IDerivedResource) {
    super(resource);

    this.creator = creator;
  }

  public get root(): SourceCodeResource {
    if (this.creator instanceof DerivedCodeResource) {
      return this.creator.root;
    }
    return this.creator;
  }
}

export default DerivedCodeResource;
