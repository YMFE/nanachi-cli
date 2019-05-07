import fs from 'fs-extra';
import FileResource, { IFileResource } from './FileResource';
import { ResourceState } from './Resource';

export interface IDuplexResource extends IFileResource {
  emit?: boolean;
}

class DuplexResource extends FileResource {
  public emit: boolean;
  public emitted: boolean = false;

  constructor({ emit = true, ...resource }: IDuplexResource) {
    super(resource);

    this.emit = emit;
  }

  public async read() {
    try {
      const buffer = await fs.readFile(this.rawPath);

      this.buffer = buffer;
      this.state = ResourceState.Read;
    } catch (e) {
      this.state = ResourceState.Error;
      this.error = e;
    }
  }

  public async write() {
    if (this.state === ResourceState.Emit) {
      try {
        await fs.outputFile(this.destPath, this.utf8Content);
        this.state = ResourceState.Emitted;
      } catch (e) {
        this.state = ResourceState.Error;
        this.error = e;
      }
    }
  }
}

export default DuplexResource;
