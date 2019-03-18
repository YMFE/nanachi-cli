import JavaScript from './JavaScript';

class JavaScriptClass extends JavaScript {
  public async process() {
    await super.load();
    super.initOptions();
    super.parse();
    super.generate();
  }
}

export default JavaScriptClass;
