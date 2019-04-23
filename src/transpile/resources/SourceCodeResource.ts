import { File } from '@babel/types';
import DuplexResource from './DuplexResource';
import { ResourceState } from './Resource';

class SourceCodeResource extends DuplexResource {
  public sourceCode: string;
  public ast: File;
  public sourceMap: object;

  public async load() {
    this.state = ResourceState.Ready;
    this.error = null;

    await this.read();

    this.sourceCode = this.utf8Content;
  }
}

export default SourceCodeResource;
