import BINARY_EXECUTABLE_NAME from '@commands/BINARY_EXECUTABLE_NAME';
import chalk from 'chalk';

export default {
  name: chalk`{white.bold  command } {green.bold page}
  `,
  desc: chalk`{white.bold  description }

    {green.bold  ${BINARY_EXECUTABLE_NAME}} {green.bold page} {yellow.bold [name]} {bold 新建一个空页面}
  `,
  example: chalk`{white.bold  example }

      {green.bold ${BINARY_EXECUTABLE_NAME}} {green.bold page} {yellow.bold foo} {bold 新建一个名为 foo 的页面}
  `
};
