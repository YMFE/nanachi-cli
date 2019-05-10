import RemoteResource from './RemoteResource';

interface IBlob {
  url: string;
  size: number;
  content: string;
}

class RemoteRunTime extends RemoteResource {
  public async process() {
    await super.process();
    this.extractRuntimeFromAPIResponse();
  }

  private extractRuntimeFromAPIResponse() {
    const response: IBlob = JSON.parse(this.buffer.toString());
    const runtimeBase64 = response.content;
    this.buffer = Buffer.from(runtimeBase64, 'base64');
  }
}

export default RemoteRunTime;
