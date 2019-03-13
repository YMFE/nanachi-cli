import BINARY_EXECUTABLE_NAME from '@commands/BINARY_EXECUTABLE_NAME';
import chalk from 'chalk';

export default {
  name: chalk`{white.bold  command } {green.bold help}
  `,
  desc: chalk`{white.bold  description }

    {green.bold  ${BINARY_EXECUTABLE_NAME}} {green.bold help} {bold 查看帮助信息}
  `,
  example: chalk`{white.bold  example }

      {green.bold ${BINARY_EXECUTABLE_NAME}} {green.bold help} {bold 查看帮助信息}
  `
};
