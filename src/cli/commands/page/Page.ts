import { InterfaceSubCommand } from '@commands/SubCommand';
import createPageTemplate from './createPageTemplate';
import EntityInitialization from './EntityInitialization';

class Page extends EntityInitialization {
  constructor(args: InterfaceSubCommand) {
    super({
      ...args,
      type: 'pages',
      createTemplate: createPageTemplate
    });
  }
}

export default Page;
