import SubCommand, { InterfaceSubCommand } from '@commands/SubCommand';
import { stop } from '@shared/spinner';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

interface InterfaceEntityInitialization extends InterfaceSubCommand {
  type: string;
  createTemplate: InterfaceCreateTemplate;
}

type InterfaceCreateTemplate = (name: string) => string;

class EntityInitialization extends SubCommand {
  private type: string;
  private createTemplate: InterfaceCreateTemplate;

  constructor({
    type,
    createTemplate,
    ...subCommandArgs
  }: InterfaceEntityInitialization) {
    super(subCommandArgs);
    this.type = type;
    this.createTemplate = createTemplate;
  }

  public run() {
    this.createEntity();
  }

  public checkIfEntityNameProvided() {
    if (this.entityName) return;

    stop(
      chalk`{bold There seems to be no {yellow ${
        this.entityTag
      } name} provided, make sure you provide a valid name.}`
    );

    this.exit(-1);
  }

  private get entityTag() {
    return `${this.type.charAt(0).toUpperCase()}${this.type.slice(1, -1)}`;
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

  private async createEntity() {
    try {
      await this.checkIfEntityNameProvided();
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
    if (await fs.pathExists(this.sourceDir)) return;

    stop(
      chalk`{bold There seems to be no {yellow source} directory in current directory {green (${
        this.cwd
      })}, make sure you are in the project root.}`
    );

    this.exit(-1);
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
    await fs.outputFile(this.entityPath, this.createTemplate(this.entityName));

    stop(
      chalk`{bold ${this.entityTag} {green ${
        this.entityName
      }} has been created.}`
    );
  }
}

export default EntityInitialization;
