import fs from 'fs-extra';
import FileResource, { InterfaceFileResource } from './FileResource';

export interface InterfaceReadableResource extends InterfaceFileResource {
  name: string;
  ext: string;
  directory: string;
}

export const enum ReadableResourceState {
  Ready = 0,
  Read = 1,
  Error = 2
}

class ReadableResource extends FileResource {
  public state: ReadableResourceState = ReadableResourceState.Ready;
  public error: Error;

  constructor(resource: InterfaceReadableResource) {
    super(resource);
  }

  public async read() {
    try {
      const content = await fs.readFile(this.fullFilePath, this.encoding);

      this.setContent(content);
      this.state = ReadableResourceState.Read;
    } catch (e) {
      this.state = ReadableResourceState.Error;
      this.error = e;
    }
  }
}

export default ReadableResource;
