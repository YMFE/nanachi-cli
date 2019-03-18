import fs from 'fs-extra';
import FileResource, { InterfaceFileResource } from './FileResource';
import { ErrorReportableResourceState } from './ReadableResource';

export interface InterfaceWritableResource extends InterfaceFileResource {
  emit?: boolean;
}

class WritableResource extends FileResource {
  public emit: boolean;
  public emitted: boolean = false;
  public error: Error;
  public state: ErrorReportableResourceState = ErrorReportableResourceState.Ready;

  constructor({ emit = true, ...resource }: InterfaceWritableResource) {
    super(resource);

    this.emit = emit;
  }

  public async write() {
    if (this.emit) {
      try {
        await fs.outputFile(this.rawPath, this.content);
        this.emitted = true;
      } catch (e) {
        this.state = ErrorReportableResourceState.Error;
        this.error = e;
      }
    }
  }
}

export default WritableResource;
