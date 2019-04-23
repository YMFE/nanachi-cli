import fs from 'fs-extra';
import FileResource, { IFileResource } from './FileResource';
import { ResourceState } from './Resource';

export interface IWritableResource extends IFileResource {
  emit?: boolean;
}

class DuplexResource extends FileResource {
  public emit: boolean;
  public emitted: boolean = false;

  constructor({ emit = true, ...resource }: IWritableResource) {
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

  public readSync() {
    try {
      const buffer = fs.readFileSync(this.rawPath);

      this.buffer = buffer;
      this.state = ResourceState.Read;
    } catch (e) {
      this.state = ResourceState.Error;
      this.error = e;
    }
  }

  public async write() {
    if (this.emit) {
      try {
        this.emit = false;
        await fs.outputFile(this.destPath, this.utf8Content);
        this.emitted = true;
      } catch (e) {
        this.state = ResourceState.Error;
        this.error = e;
      }
    }
  }

  public writeSync() {
    if (this.emit) {
      try {
        this.emit = false;
        fs.outputFileSync(this.destPath, this.utf8Content);
        this.emitted = true;
      } catch (e) {
        this.state = ResourceState.Error;
        this.error = e;
      }
    }
  }
}

export default DuplexResource;
