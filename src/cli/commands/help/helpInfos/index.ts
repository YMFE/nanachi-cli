export interface InterfaceCommandHelpInfo {
  name: string;
  desc: string;
  example: string;
}

interface InterfaceCommandHelpInfos {
  [command: string]: InterfaceCommandHelpInfo;
}

import build from './build';
import component from './component';
import help from './help';
import init from './init';
import page from './page';
import watch from './watch';

const helpInfos: InterfaceCommandHelpInfos = {
  build,
  component,
  help,
  init,
  page,
  watch
};

export default helpInfos;
