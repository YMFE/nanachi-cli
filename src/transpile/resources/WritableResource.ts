import fs from 'fs-extra';
import FileResource, { InterfaceFileResource } from './FileResource';
import { ErrorReportableResourceState } from './Resource';

export interface IWritableResource extends InterfaceFileResource {
  emit?: boolean;
}

class WritableResource extends FileResource {
  public emit: boolean;
  public emitted: boolean = false;

  constructor({ emit = true, ...resource }: IWritableResource) {
    super(resource);

    this.emit = emit;
  }

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

  public async write() {
    if (this.emit) {
      try {
        this.emit = false;
        await fs.outputFile(this.destPath, this.content);
        this.emitted = true;
      } catch (e) {
        this.state = ErrorReportableResourceState.Error;
        this.error = e;
      }
    }
  }
}

export default WritableResource;
