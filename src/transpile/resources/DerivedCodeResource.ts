import SourceCodeResource from './SourceCodeResource';
import WritableResource, {
  IWritableResource
} from './WritableResource';

export interface IDerivedResource extends IWritableResource {
  creator: SourceCodeResource;
}

class DerivedCodeResource extends WritableResource {
  public creator: SourceCodeResource;

  constructor({ creator, ...resource }: IDerivedResource) {
    super(resource);
    this.creator = creator;
  }
}

export default DerivedCodeResource;
