import path from 'path';
import Resource, { InterfaceResource } from './Resource';

export interface IFileResource extends InterfaceResource {
  rawPath: string;
}

class FileResource extends Resource {
  public rawPath: string;

  private parsedPath: path.ParsedPath;
  private customDestPath: string;
  private customDestExt: string;

  constructor({ rawPath, ...resource }: IFileResource) {
    super(resource);

    this.init(rawPath);
    this.rawPath = rawPath;
  }

  public relativeFromSource(from: string) {
    return path.relative(from, this.rawPath);
  }

  public relativeFromDest(from: string) {
    return path.relative(from, this.destPath);
  }

  public setCustomDestPath(destPath: string) {
    this.customDestPath = destPath;
  }

  private init(rawPath: string) {
    this.parsedPath = path.parse(rawPath);
  }

  public get destPath() {
    if (this.customDestPath) return this.customDestPath;

    const relativePath = this.relativeFromSource(
      this.transpiler.projectSourceDirectory
    );
    const intermediatePath = path.resolve(
      this.transpiler.projectDestDirectory,
      relativePath
    );
    const { dir, name } = path.parse(intermediatePath);

    return path.join(dir, `${name}${this.destExt}`);
  }

  public get destDir() {
    return path.parse(this.destPath).dir;
  }

  public get destExt() {
    return this.customDestExt || this.ext;
  }

  public set destExt(ext: string) {
    this.customDestExt = ext;
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
