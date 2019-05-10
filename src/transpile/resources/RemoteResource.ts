import Transpiler from '@transpiler/Transpiler';
import axios from 'axios';
import DuplexResource from './DuplexResource';
import { ResourceState } from './Resource';

class RemoteResource extends DuplexResource {
  constructor(private uri: string, transpiler: Transpiler) {
    super({
      rawPath: uri,
      transpiler
    });
  }

  public async process() {
    try {
      await this.retrieve();
    } catch (error) {
      this.state = ResourceState.Error;
      this.error = error;
    }
  }

  public async retrieve() {
    this.buffer = (await axios.get<Buffer>(this.rawPath, {
      responseType: 'arraybuffer'
    })).data;
  }
}

export default RemoteResource;
