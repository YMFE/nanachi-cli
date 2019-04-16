import { File } from '@babel/types';
import DuplexResource from './DuplexResource';
import { ErrorReportableResourceState } from './Resource';

class SourceCodeResource extends DuplexResource {
  public sourceCode: string;
  public ast: File;
  public sourceMap: object;

  public async load() {
    this.state = ErrorReportableResourceState.Ready;
    this.error = '';

    await this.read();

    this.sourceCode = this.content;
  }
}

export default SourceCodeResource;
