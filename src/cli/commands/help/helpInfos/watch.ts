import BINARY_EXECUTABLE_NAME from '@commands/BINARY_EXECUTABLE_NAME';
import chalk from 'chalk';

export default {
  name: chalk`{white.bold  command } {green.bold watch}
  `,
  desc: chalk`{white.bold  description }

    {green.bold  ${BINARY_EXECUTABLE_NAME}} {green.bold watch:}{yellow.bold [type]} {bold 根据小程序类型监听文件修改并自动编译}
        {cyan.bold  type }
            {yellow.bold wx} {bold 微信}
            {yellow.bold bu} {bold 百度}
            {yellow.bold tt} {bold 头条}
            {yellow.bold quick} {bold 快应用}
  `,
  example: chalk`{white.bold  example }

      {green.bold ${BINARY_EXECUTABLE_NAME}} {green.bold watch:}{yellow.bold wx} {bold 监听文件修改并自动编译为微信小程序}
  `
};
