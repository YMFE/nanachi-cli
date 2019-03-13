import yargs from 'yargs';

export interface InterfaceSubCommand {
  name: string;
  argv: yargs.Arguments;
}

class SubCommand {
  public argv: yargs.Arguments;
  public name: string;
  public cwd: string = process.cwd();

  constructor({ name, argv }: InterfaceSubCommand) {
    this.name = name;
    this.argv = argv;
  }

  public get subCommand() {
    return this.name;
  }

  public get options() {
    return this.argv;
  }

  public exit(code: number = 0) {
    process.exit(code);
  }
}

export default SubCommand;
