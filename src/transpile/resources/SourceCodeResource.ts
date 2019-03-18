import { File } from '@babel/types';
import ReadableResource from './ReadableResource';
import WritableResource from './WritableResource';

class SourceCodeResource extends ReadableResource {
  public sourceCode: string;
  public ast: File;
  public sourceMap: object;
  public writableResource: WritableResource;

  public async load() {
    await this.read();

    this.sourceCode = this.content;
  }
}

export default SourceCodeResource;
