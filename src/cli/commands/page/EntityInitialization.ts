import SubCommand, { InterfaceSubCommand } from '@commands/SubCommand';
import { stop } from '@shared/spinner';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

interface InterfaceEntityInitialization extends InterfaceSubCommand {
  type: string;
  template: string;
}

class EntityInitialization extends SubCommand {
  private type: string;
  private template: string;

  constructor({
    type,
    template,
    ...subCommandArgs
  }: InterfaceEntityInitialization) {
    super(subCommandArgs);
    this.type = type;
    this.template = template;
  }

  public run() {
    this.createEntity();
  }

  private get entityTag() {
    return `${this.type.charAt(0).toUpperCase()}${this.type.slice(1, -1)}`;
  }

  private async createEntity() {
    try {
      await this.checkIfHasSourceDir();
      await this.checkIfEntityNameOccupied();
      await this.outputPage();
    } catch (err) {
      stop(
        chalk`{bold ${this.entityTag} {yellow ${
          this.entityName
        }} create failed with error ${err}}`
      );
    }
  }

  private async checkIfHasSourceDir() {
    if (!(await fs.pathExists(this.sourceDir))) {
      stop(
        chalk`{bold There seems to be no {yellow source} directory in current directory {green (${
          this.cwd
        })}}`
      );

      this.exit(-1);
    }
  }

  protected get entityName() {
    return this.argv._[1];
  }

  protected get sourceDir() {
    return path.resolve(this.cwd, 'source');
  }

  protected get entityDir() {
    return path.resolve(this.sourceDir, this.type, this.entityName);
  }

  protected get entityPath() {
    return path.resolve(this.entityDir, 'index.js');
  }

  private async checkIfEntityNameOccupied() {
    if (await fs.pathExists(this.entityDir)) {
      stop(
        chalk`{bold ${this.entityTag} {yellow ${
          this.entityName
        }} is already existed, use another name instead.}`
      );
      this.exit(-1);
    }
  }

  private async outputPage() {
    await fs.outputFile(this.entityPath, this.template);

    stop(
      chalk`{bold ${this.entityTag} {green ${
        this.entityName
      }} has been created.}`
    );
  }
}

export default EntityInitialization;
