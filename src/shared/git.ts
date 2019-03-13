import execute from '@shared/execute';

interface InterfaceGitCloneConfig {
  url: string;
  checkout: string;
  dirname: string;
}

export async function clone({ url, checkout, dirname }: InterfaceGitCloneConfig) {
  await execute('git', ['clone', url, dirname, '-b', checkout]);
}

export async function init() {
  await execute('git', ['init']);
}

export default {
  clone,
  init
};
