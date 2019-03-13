import BINARY_EXECUTABLE_NAME from '@commands/BINARY_EXECUTABLE_NAME';
import chalk from 'chalk';

export default {
  name: chalk`{white.bold  command } {green.bold component}
  `,
  desc: chalk`{white.bold  description }

    {green.bold  ${BINARY_EXECUTABLE_NAME}} {green.bold component} {yellow.bold [name]} {bold 新建一个空组件}
  `,
  example: chalk`{white.bold  example }

      {green.bold ${BINARY_EXECUTABLE_NAME}} {green.bold component} {yellow.bold Foo（大写字母开头）} {bold 新建一个名为 Foo 的组件}`
};
