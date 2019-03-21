import { File } from '@babel/types';
import ReadableResource from './ReadableResource';
import { ErrorReportableResourceState } from './Resource';
import WritableResource from './WritableResource';

class SourceCodeResource extends ReadableResource {
  public sourceCode: string;
  public ast: File;
  public sourceMap: object;
  public writableResource: WritableResource;

  public async load() {
    this.state = ErrorReportableResourceState.Ready;
    this.error = '';

    await this.read();

    this.sourceCode = this.content;
  }
}

export default SourceCodeResource;
