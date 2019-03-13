/* tslint:disable no-console*/
import BINARY_EXECUTABLE_NAME from '@commands/BINARY_EXECUTABLE_NAME';
import chalk from 'chalk';
import yargs from 'yargs';
import component from './commands/component/index';
import help from './commands/help/index';
import init from './commands/init/index';
import page from './commands/page/index';

function registerOptions() {
  return yargs
    .option('debug', {
      desc: '调试模式',
      alias: 'D',
      default: false,
      boolean: true
    })
    .option('silent', {
      desc: '静默模式',
      alias: 's',
      default: false,
      boolean: true
    })
    .option('version', {
      desc: '版本号',
      alias: 'v'
    })
    .help(false);
}

function cli() {
  const {
    argv: { _ }
  } = registerOptions();

  const [subCommand] = _;

  switch (true) {
    case _.length === 0:
      help();
      break;
    case _.length > 2:
      console.log(
        chalk`{yellow.bold Too many arguments provided!} ` +
          chalk`Execute {green.bold ${BINARY_EXECUTABLE_NAME} help} to see help.`
      );
      break;
    case String(subCommand) === 'help':
      help();
      break;
    case String(subCommand) === 'init':
      init();
      break;
    case String(subCommand).startsWith('build'):
      console.log('build');
      break;
    case String(subCommand).startsWith('watch'):
      console.log('watch');
      break;
    case String(subCommand) === 'page':
      page();
      break;
    case String(subCommand) === 'component':
      component();
      break;
    default:
      help();
      break;
  }
}

cli();
