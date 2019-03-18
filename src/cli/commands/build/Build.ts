import SubCommand from '@commands/SubCommand';
import Transpiler from '@transpiler/Transpiler';

class Build extends SubCommand {
  public run() {
    this.build();
  }
  private build() {
    const transpiler = new Transpiler(process.cwd());
    transpiler.process();
  }
}

export default Build;
