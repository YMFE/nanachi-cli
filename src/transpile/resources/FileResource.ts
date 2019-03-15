import path from 'path';
import Resource, { InterfaceResource } from './Resource';

export interface InterfaceFileResource extends InterfaceResource {
  ext: string;
  name: string;
  directory: string;
}

class FileResource extends Resource {
  public ext: string;
  public name: string;
  public directory: string;

  constructor({ ext, name, directory, ...resource }: InterfaceFileResource) {
    super(resource);

    this.ext = ext;
    this.name = name;
    this.directory = directory;
  }

  public get fileName() {
    return `${this.name}${this.ext}`;
  }

  public get fullFilePath() {
    return path.resolve(this.directory, this.fileName);
  }

  public relative(from: string) {
    return path.relative(from, this.fullFilePath);
  }
}

export default FileResource;
