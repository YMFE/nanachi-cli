import { ResourceState } from '@resources/Resource';
import JavaScript from './JavaScript';

class JavaScriptLibrary extends JavaScript {
  public async process() {
    await this.read();
    this.state = ResourceState.Emit;
  }
}

export default JavaScriptLibrary;
