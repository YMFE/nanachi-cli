import execute from '@shared/execute';

interface InterfaceNpmInstallConfig {
  registry: string;
}

export async function install({ registry }: InterfaceNpmInstallConfig) {
  await execute('npm', ['--registry', registry]);
}
