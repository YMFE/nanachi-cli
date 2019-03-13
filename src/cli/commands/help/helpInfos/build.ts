import BINARY_EXECUTABLE_NAME from '@commands/BINARY_EXECUTABLE_NAME';
import chalk from 'chalk';

export default {
  name: chalk`{white.bold  command } {green.bold build}
  `,
  desc: chalk`{white.bold  description }

    {green.bold  ${BINARY_EXECUTABLE_NAME}} {green.bold build:}{yellow.bold [type]} {bold 根据小程序类型构建项目}
        {white.bold  type }
            {yellow.bold wx} {bold 微信}
            {yellow.bold bu} {bold 百度}
            {yellow.bold tt} {bold 头条}
            {yellow.bold quick} {bold 快应用}
  `,
  example: chalk`{white.bold  example }

      {green.bold ${BINARY_EXECUTABLE_NAME}} {green.bold build:}{yellow.bold wx} {bold 构建微信小程序}
  `
};
