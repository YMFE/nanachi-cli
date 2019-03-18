import JavaScriptClass from './JavaScriptClass';

class JavaScriptApp extends JavaScriptClass {
  public async process() {
    await super.load();
    super.initOptions();
    super.parse();
    super.generate();
  }
}

export default JavaScriptApp;
