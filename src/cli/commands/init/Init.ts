import * as git from '@shared/git';
import { stop } from '@shared/spinner';
import chalk from 'chalk';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import SubCommand from '../SubCommand';
import Templates from './Templates';

// tslint:disable-next-line: no-var-requires
const validate = require('validate-npm-package-name');

interface InterfaceProjectName {
  projectName: string;
}

interface InterfaceTemplateId {
  templateId: string;
}

class Init extends SubCommand {
  private templates: Templates = new Templates();
  private inputProjectName: string;
  private templateId: string;

  public run() {
    this.init();
  }

  private async init() {
    await this.checkIfNameProvided();
    await this.checkProjectNameOccupied();

    const { templateId } = await this.askForTemplateId();
    this.templateId = templateId;

    const { repositoryUrl: url, checkout } = this.templates.templates[
      this.templateId
    ];

    await git.clone({ url, checkout, dirname: this.projectName });

    await this.removeGitDirectory();
  }

  private get choices() {
    const templates = this.templates.templates;

    return Object.keys(templates).map(id => ({
      name: `${templates[id].name} - ${templates[id].description}`,
      value: templates[id].id
    }));
  }

  private get projectDirectory() {
    return path.resolve(this.cwd, this.projectName);
  }

  private get projectGitDirectory() {
    return path.resolve(this.projectDirectory, '.git');
  }

  // 用户通过命令行直接输入的项目名
  // 比如 nanachi init foo
  private get initialProjectName() {
    return this.options._[1];
  }

  private get projectName() {
    return this.initialProjectName || this.inputProjectName;
  }

  private async checkProjectNameOccupied() {
    if (await fs.pathExists(this.projectDirectory)) {
      stop(
        chalk`{cyan.bold {yellow.bold.underline ${
          this.projectDirectory
        }} is already existed, use another name instead}`
      );

      this.exit(-1);
    }
  }

  // 如果用户没有输入用户名
  // 直接执行 nanachi init
  // 需要用户输入
  private async checkIfNameProvided() {
    if (this.initialProjectName) return;

    const { projectName } = await this.askForProjectName();
    this.inputProjectName = projectName;
  }

  private async askForProjectName(): Promise<InterfaceProjectName> {
    return inquirer.prompt([
      {
        type: 'input',
        message: '项目名称',
        name: 'projectName',
        validate(name: string) {
          const validation = validate(name);
          if (validation.validForNewPackages) return true;
          return validation.errors.join('. ');
        }
      }
    ]);
  }

  private async askForTemplateId(): Promise<InterfaceTemplateId> {
    await this.templates.retrieveRemoteTemplates();
    return inquirer.prompt([
      {
        type: 'list',
        choices: this.choices,
        message: '选择你想要的模板',
        name: 'templateId'
      }
    ]);
  }

  private async removeGitDirectory() {
    await fs.remove(this.projectGitDirectory);
  }
}

export default Init;
