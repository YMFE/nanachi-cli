import Transpiler from '@transpiler/Transpiler';

export interface InterfaceResource {
  encoding?: string | null;
  transpiler: Transpiler;
}

export const enum ResourceState {
  Ready = 0,
  Read = 1,
  Emit = 2,
  SkipEmit = 3,
  Emitted = 4,
  Error = -1,
  FatalError = -2
}

class Resource {
  public state: ResourceState = ResourceState.Ready;
  public error: Error | null;
  public transpiler: Transpiler;

  private resourceBuffer: Buffer = Buffer.from(
    'There seems to be no content of this file, ' +
      'it did not read from file system nor generate any content.'
  );
  private resourceEncoding: string | null = null;

  constructor({ encoding = null, transpiler }: InterfaceResource) {
    this.resourceEncoding = encoding;
    this.transpiler = transpiler;
  }

  public get resolve() {
    return this.transpiler.resolve;
  }

  public get platform() {
    return this.transpiler.platform;
  }

  public get utf8Content() {
    return this.resourceBuffer.toString('utf8');
  }

  public set utf8Content(content: string) {
    this.resourceBuffer = Buffer.from(content, 'utf8');
  }

  public get buffer() {
    return this.resourceBuffer;
  }

  public set buffer(buffer: Buffer) {
    this.resourceBuffer = buffer;
  }

  public get encoding() {
    return this.resourceEncoding;
  }

  public setEncoding(encoding: string) {
    this.resourceEncoding = encoding;
  }
}

export default Resource;
