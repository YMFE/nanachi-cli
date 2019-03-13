import fs from 'fs-extra';
import path from 'path';
import Resource from './Resource';

interface InterfaceReadableResource {
  name: string;
  ext: string;
  directory: string;
}

enum ReadableResourceState {
  Ready = 0,
  Read = 1,
  Error = 2
}

class ReadableResource extends Resource {
  public name: string;
  public ext: string;
  public directory: string;
  public state: ReadableResourceState = ReadableResourceState.Ready;
  public error: Error;

  constructor({ name, ext, directory }: InterfaceReadableResource) {
    super();
    this.name = name;
    this.ext = ext;
    this.directory = directory;
  }

  private get fileName() {
    return `${this.name}${this.ext}`;
  }

  private get fullFilePath() {
    return path.resolve(this.directory, this.fileName);
  }

  public async read() {
    try {
      this.content = await fs.readFile(this.fullFilePath, this.encoding);
      this.state = ReadableResourceState.Read;
    } catch (e) {
      this.state = ReadableResourceState.Error;
      this.error = e;
    }
  }
}

export default ReadableResource;
