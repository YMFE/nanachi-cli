import SubCommand from '@commands/SubCommand';
import { stop } from '@shared/spinner';
import Transpiler, { Platforms } from '@transpiler/Transpiler';
import chalk from 'chalk';

class Build extends SubCommand {
  public run() {
    this.build();
  }

  private build() {
    const [, platformStr] = this.options._[0].split(':');
    let platform = Platforms.wx;

    switch (platformStr) {
      case 'wx':
        platform = Platforms.wx;
        break;

      case 'bu':
        platform = Platforms.bu;
        break;

      case 'ali':
        platform = Platforms.ali;
        break;

      case 'tt':
        platform = Platforms.tt;
        break;

      case 'quick':
        platform = Platforms.wx;
        break;

      default:
        stop(chalk`{bold Platform({red ${platformStr}}) not recognized.}`);
        this.exit(-1);
        break;
    }

    const transpiler = new Transpiler({
      projectRoot: process.cwd(),
      platform,
      command: this
    });

    transpiler.process();
  }
}

export default Build;
