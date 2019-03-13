import EntityInitialization from '@commands/page/EntityInitialization';
import { InterfaceSubCommand } from '@commands/SubCommand';
import { stop } from '@shared/spinner';
import chalk from 'chalk';
import COMPONENT_TEMPLATE from './COMPONENT_TEMPLATE';

class Component extends EntityInitialization {
  constructor(args: InterfaceSubCommand) {
    super({
      ...args,
      type: 'components',
      template: COMPONENT_TEMPLATE
    });
  }

  public run() {
    if (this.validComponentName) return super.run();

    stop(
      chalk`{bold Component name you provided ({green ${
        this.entityName
      }}) is not valid, it should start with a capital letter like {green Foo}.}`
    );

    this.exit(-1);
  }
  private get validComponentName() {
    const validNameRegex = /^[A-Z]\w+/;
    return validNameRegex.test(this.entityName);
  }
}

export default Component;
