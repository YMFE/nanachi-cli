import DuplexResource, {
  IWritableResource
} from './DuplexResource';
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
}

export default DerivedCodeResource;
