import path from 'path';
import Resource, { InterfaceResource } from './Resource';

export interface InterfaceFileResource extends InterfaceResource {
  rawPath: string;
}

class FileResource extends Resource {
  public rawPath: string;

  private parsedPath: path.ParsedPath;

  constructor({ rawPath, ...resource }: InterfaceFileResource) {
    super(resource);

    this.init(rawPath);
    this.rawPath = rawPath;
  }

  public relative(from: string) {
    return path.relative(from, this.rawPath);
  }

  private init(rawPath: string) {
    this.parsedPath = path.parse(rawPath);
  }

  public get destPath() {
    const relativePath = this.relative(this.transpiler.projectSourceDirectory);
    return path.resolve(this.transpiler.projectDestDirectory, relativePath);
  }

  public get ext() {
    return this.parsedPath.ext;
  }

  public get name() {
    return this.parsedPath.name;
  }

  public get dir() {
    return this.parsedPath.dir;
  }

  public get base() {
    return this.parsedPath.base;
  }

  public get pathWithoutExt() {
    return path.resolve(this.dir, this.name);
  }
}

export default FileResource;
