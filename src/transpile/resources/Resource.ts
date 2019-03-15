export interface InterfaceResource {
  content?: string;
  encoding?: string;
}

class Resource {
  private resourceContent: string;
  private resourceEncoding: string;

  constructor({ content = '', encoding = 'utf8' }: InterfaceResource = {}) {
    this.resourceContent = content;
    this.resourceEncoding = encoding;
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
