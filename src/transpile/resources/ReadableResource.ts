import fs from 'fs-extra';
import FileResource from './FileResource';
import { ErrorReportableResourceState } from './Resource';

class ReadableResource extends FileResource {
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
