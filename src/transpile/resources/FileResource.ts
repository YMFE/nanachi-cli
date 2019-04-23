import path from 'path';
import Resource, { InterfaceResource } from './Resource';

export interface IFileResource extends InterfaceResource {
  rawPath: string;
}

class FileResource extends Resource {
  public rawPath: string;

  private parsedPath: path.ParsedPath;
  private parsedDestPath: path.ParsedPath;

  constructor({ rawPath, ...resource }: IFileResource) {
    super(resource);

    this.rawPath = rawPath;
    this.init();
  }

  public relativePathOfSource(from: string) {
    return path.relative(from, this.rawPath);
  }

  public relativePathOfDest(from: string) {
    return path.relative(from, this.destPath);
  }

  public relativeOfSourceDirTo(to: string) {
    return path.relative(this.dir, to);
  }

  public relativeOfDestDirTo(to: string) {
    return path.relative(this.destDir, to);
  }

  public get destPath() {
    const { dir } = this.parsedDestPath;
    return path.join(dir, this.destFilename);
  }

  public set destPath(destPath: string) {
    this.parsedDestPath = path.parse(destPath);
  }

  public get destDir() {
    return this.parsedDestPath.dir;
  }

  public set destDir(destDir: string) {
    this.parsedDestPath.dir = destDir;
  }

  public get destFilename() {
    return this.parsedDestPath.name + this.parsedDestPath.ext;
  }

  public get destExt() {
    return this.parsedDestPath.ext;
  }

  public set destExt(ext: string) {
    this.parsedDestPath.ext = ext;
  }

  public get ext() {
    return this.parsedPath.ext;
  }

  public get name() {
    return this.parsedPath.name;
  }

  public get filename() {
    return this.parsedPath.name + this.parsedPath.ext;
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

  private init() {
    this.parsedPath = path.parse(this.rawPath);
    this.parsedDestPath = {
      ...this.parsedPath
    };
    this.initDest();
  }

  private initDest() {
    const relativePathOfSource = this.relativePathOfSource(
      this.transpiler.projectSourceDirectory
    );
    const destPath = path.resolve(
      this.transpiler.projectDestDirectory,
      relativePathOfSource
    );
    this.parsedDestPath = path.parse(destPath);
  }
}

export default FileResource;
