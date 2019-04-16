import EntityInitialization from '@commands/page/EntityInitialization';
import { InterfaceSubCommand } from '@commands/SubCommandAbstract';
import { stop } from '@shared/spinner';
import chalk from 'chalk';
import createComponentTemplate from './createComponentTemplate';

class Component extends EntityInitialization {
  constructor(args: InterfaceSubCommand) {
    super({
      ...args,
      type: 'components',
      createTemplate: createComponentTemplate
    });
  }

  public run() {
    super.checkIfEntityNameProvided();

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
