import BinaryResource from '@resources/BinaryResource';
import RemoteRunTime from '@resources/RemoteRuntime';
import platformSpecificRuntimeName, {
  platformDisplay
} from '@services/platformSpecificRuntimeName';
import * as spinner from '@shared/spinner';
import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';
import inquirer from 'inquirer';
import semver from 'semver';
import Transpiler from './Transpiler';

interface ITag {
  name: string;
}

interface ITree {
  path: string;
  sha: string;
}

interface ITrees {
  url: string;
  tree: ITree[];
}

interface IVersionChoice {
  version: string;
}

class RuntimeManager {
  private static githubAPIHost = 'https://api.github.com';
  private static tagsEndpoint = '/repos/YMFE/nanachi-runtime/tags';
  private static repositoryTreeEndpoint =
    '/repos/YMFE/nanachi-runtime/git/trees/';
  private static blobEndpoint = '/repos/YMFE/nanachi-runtime/git/blobs/';
  private versionSelectRequired: boolean;
  private runtimeSHA: string;
  private version: string;
  private versions: string[];
  private request: AxiosInstance = axios.create({
    headers: {
      Accept: 'application/vnd.github.v3+json'
    },
    timeout: 30 * 1000
  });

  constructor(private transpiler: Transpiler) {
    this.transpiler = transpiler;

    if (typeof this.remoteRuntime === 'boolean') {
      this.versionSelectRequired = true;
    }
  }

  public async retrieve() {
    if (this.remoteRuntime === false) {
      const projectRuntime = await this.pickProjectRuntime();

      if (projectRuntime === null) {
        const error = new Error(
          chalk`Cannot resolve runtime, it seems that runtime has not been installed.`
        );

        // tslint:disable-next-line: no-console
        console.log(error);
        this.transpiler.command.exit(-1);
      } else {
        return projectRuntime;
      }
    }

    return this.retrieveRemoteRuntime();
  }

  private get remoteRuntime() {
    return this.transpiler.command.options.remoteRuntime;
  }

  private get tagsEndpoint() {
    return RuntimeManager.githubAPIHost + RuntimeManager.tagsEndpoint;
  }

  private get repositoryRootEndpoint() {
    return RuntimeManager.githubAPIHost + RuntimeManager.repositoryTreeEndpoint;
  }

  private get blobEndpoint() {
    return RuntimeManager.githubAPIHost + RuntimeManager.blobEndpoint;
  }

  private get repositoryEndpoint() {
    return this.repositoryRootEndpoint + this.version;
  }

  private get runtimeEndpoint() {
    return this.repositoryRootEndpoint + this.runtimeSHA;
  }

  private async validateVersion() {
    const remoteRuntime = String(this.remoteRuntime);
    const normalizedVersion = remoteRuntime.startsWith('v')
      ? remoteRuntime
      : 'v' + remoteRuntime;
    const versionValidation = this.versions.some(
      version => version === normalizedVersion
    );
    this.version = normalizedVersion;

    if (!versionValidation) {
      const { version } = await this.askForVersion(
        chalk`所提供的版本号 (${remoteRuntime}) 不存在，请从以下版本中选择合适的版本`
      );
      this.version = version;
    }
  }

  private async listTags() {
    spinner.start('正在从远程服务器获取版本列表');
    const response = await this.request.get<ITag[]>(this.tagsEndpoint);
    const tags = response.data;
    this.versions = tags.map(({ name }) => name);
    spinner.succeed(`已成功获取 ${this.versions.length} 个运行时版本`);
    return this.versions;
  }

  private async retrieveRuntimeSHA() {
    spinner.start(
      chalk`正在从远程服务器获取 {bold.green ${
        platformDisplay[this.transpiler.platform as string]
      }} 运行时的地址`
    );
    const response = await this.request.get<ITrees>(this.repositoryEndpoint);
    spinner.succeed(
      chalk`已成功获取 {bold.green ${
        platformDisplay[this.transpiler.platform as string]
      }} 运行时的地址`
    );
    const { tree } = response.data;
    const runtimeTree = tree.find(({ path }) => path === 'runtime');
    const runtimeSHA = runtimeTree!.sha;
    this.runtimeSHA = runtimeSHA;
    return runtimeSHA;
  }

  private async retrievePlatformSHA() {
    spinner.start(
      chalk`正在下载 {bold.green ${
        platformDisplay[this.transpiler.platform as string]
      }} 的运行时`
    );
    const response = await this.request.get<ITrees>(this.runtimeEndpoint);
    spinner.succeed(
      chalk`已成功下载 {bold.green ${
        platformDisplay[this.transpiler.platform as string]
      }} 的运行时`
    );
    const { tree } = response.data;
    const currentPlatformRuntimeName =
      platformSpecificRuntimeName[this.transpiler.platform];
    const runtimeTree = tree.find(
      ({ path }) => path === currentPlatformRuntimeName
    );

    if (runtimeTree) {
      return runtimeTree.sha;
    } else {
      throw new Error(
        chalk`{bold.red ${
          platformDisplay[this.transpiler.platform as string]
        } 没有此版本的运行时}`
      );
    }
  }

  private async pickProjectRuntime() {
    try {
      const { location } = await this.transpiler.resolve('@react');

      return new BinaryResource({
        rawPath: location,
        transpiler: this.transpiler
      });
    } catch (error) {
      return null;
    }
  }

  private askForVersion(
    message: string = '选择你需要的版本'
  ): Promise<IVersionChoice> {
    return inquirer.prompt({
      type: 'list',
      choices: this.versions,
      message,
      name: 'version'
    });
  }

  private async retrieveRemoteRuntime() {
    await this.listTags();

    if (this.versionSelectRequired) {
      const { version } = await this.askForVersion();
      this.version = version;
    } else {
      await this.validateVersion();
    }

    await this.retrieveRuntimeSHA();
    const platformRuntimeSHA = await this.retrievePlatformSHA();
    const platformRuntimeBlobUrl = this.blobEndpoint + platformRuntimeSHA;
    const remoteResource = new RemoteRunTime(
      platformRuntimeBlobUrl,
      this.transpiler
    );
    return remoteResource;
  }
}

export default RuntimeManager;
