import fs from 'fs-extra';
import FileResource from './FileResource';

export const enum ErrorReportableResourceState {
  Ready = 0,
  Read = 1,
  Error = 2
}

class ReadableResource extends FileResource {
  public state: ErrorReportableResourceState = ErrorReportableResourceState.Ready;
  public error: Error;

  public async read() {
    try {
      const content = await fs.readFile(this.rawPath, this.encoding);

      this.setContent(content);
      this.state = ErrorReportableResourceState.Read;
    } catch (e) {
      this.state = ErrorReportableResourceState.Error;
      this.error = e;
    }
  }
}

export default ReadableResource;
