import SourceCodeResource from './SourceCodeResource';
import WritableResource, {
  InterfaceWritableResource
} from './WritableResource';

export interface InterfaceDerivedResource extends InterfaceWritableResource {
  creator: SourceCodeResource;
}

class DerivedCodeResource extends WritableResource {
  public creator: SourceCodeResource;

  constructor({ creator, ...resource }: InterfaceDerivedResource) {
    super(resource);
    this.creator = creator;
  }
}

export default DerivedCodeResource;
