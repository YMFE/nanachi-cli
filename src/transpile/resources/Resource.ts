import Transpiler from '@transpiler/Transpiler';

export interface InterfaceResource {
  content?: string;
  encoding?: string;
  transpiler: Transpiler;
}

export const enum ErrorReportableResourceState {
  Ready = 0,
  Read = 1,
  Error = 2
}

class Resource {
  public state: ErrorReportableResourceState =
    ErrorReportableResourceState.Ready;
  public error: Error;
  public transpiler: Transpiler;

  private resourceContent: string;
  private resourceEncoding: string;

  constructor({
    content = '',
    encoding = 'utf8',
    transpiler
  }: InterfaceResource) {
    this.resourceContent = content;
    this.resourceEncoding = encoding;
    this.transpiler = transpiler;
  }

  public get content() {
    return this.resourceContent;
  }

  public get encoding() {
    return this.resourceEncoding;
  }

  public setContent(content: string) {
    this.resourceContent = content;
  }

  public setEncoding(encoding: string) {
    this.resourceEncoding = encoding;
  }
}

export default Resource;
