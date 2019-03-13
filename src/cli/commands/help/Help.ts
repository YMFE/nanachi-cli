/* tslint:disable:no-console */

import inquirer from 'inquirer';
import SubCommand from '../SubCommand';
import helpInfos from './helpInfos/index';

interface InterfaceInquirerAnswer {
  command: string;
}

class Help extends SubCommand {
  public run() {
    this.help();
  }

  private async help() {
    try {
      const { command } = await this.askForCommand();

      this.outputCommandHelp(command);
    } catch (err) {
      console.log(err);
      process.exit(-1);
    }
  }

  private outputCommandHelp(command: string) {
    console.log(helpInfos[command].name);
    console.log(helpInfos[command].desc);
    console.log(helpInfos[command].example);
  }

  private async askForCommand(): Promise<InterfaceInquirerAnswer> {
    return inquirer.prompt([
      {
        type: 'list',
        choices: ['init', 'watch', 'build', 'help', 'component', 'page'],
        message: '选择你想查看的命令帮助',
        name: 'command'
      }
    ]);
  }
}

export default Help;
