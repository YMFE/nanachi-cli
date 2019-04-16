import yargs from 'yargs';

export interface InterfaceSubCommand {
  name: string;
  argv: yargs.Arguments;
}

abstract class SubCommandAbstract {
  public abstract argv: yargs.Arguments;
  public abstract name: string;
  public abstract cwd: string = process.cwd();

  constructor(commandOptions: InterfaceSubCommand) {
    // initialize SubCommand
  }

  public abstract exit(code: number): void;
}

export default SubCommandAbstract;
