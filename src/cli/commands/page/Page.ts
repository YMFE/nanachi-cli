import { InterfaceSubCommand } from '@commands/SubCommand';
import EntityInitialization from './EntityInitialization';
import PAGE_TEMPLATE from './PAGE_TEMPLATE';

class Page extends EntityInitialization {
  constructor(args: InterfaceSubCommand) {
    super({
      ...args,
      type: 'pages',
      template: PAGE_TEMPLATE
    });
  }
}

export default Page;
