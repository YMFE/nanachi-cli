import fs from 'fs-extra';
import FileResource, { InterfaceFileResource } from './FileResource';

export interface InterfaceWritableResource extends InterfaceFileResource {
  emit?: boolean;
}

class WritableResource extends FileResource {
  public emit: boolean;
  public emitted: boolean;

  constructor({ emit = true, ...resource }: InterfaceWritableResource) {
    super(resource);
    this.emit = emit;
  }

  public async write() {
    await fs.outputFile(this.fullFilePath, this.content);
  }
}

export default WritableResource;
