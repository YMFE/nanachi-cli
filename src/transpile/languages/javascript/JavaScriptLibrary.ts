import JavaScript from './JavaScript';

class JavaScriptLibrary extends JavaScript {
  public async process() {
    await this.read();
  }
}

export default JavaScriptLibrary;
