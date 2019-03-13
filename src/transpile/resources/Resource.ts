class Resource {
  public content: string;
  public encoding: string;

  constructor(content: string = '', encoding: string = 'utf8') {
    this.content = content;
    this.encoding = encoding;
  }

  public setContent(content: string) {
    this.content = content;
  }
  public setEncoding(encoding: string) {
    this.encoding = encoding;
  }
}

export default Resource;
