import FileResource from '@resources/FileResource';
import { ResourceState } from '@resources/Resource';
import chalk from 'chalk';
import { log, stop } from './spinner';

function reportError(resource: FileResource) {
  if (resource.state === ResourceState.Error) {
    const error = resource.error!.toString();

    log(chalk`{white.bgRed.bold Compile Error:}`);
    log(
      chalk`  {bold.dim Source File Path:} {bold.underline ${resource.rawPath}}`
    );
    stop(chalk`  {bold.dim Error Message:} {bold ${error}}`);
  }

  if (resource.state === ResourceState.FatalError) {
    const error = resource.error!.toString();

    log(chalk`{white.bgRed.bold Fatal Error:}`);
    log(
      chalk`  {bold.dim Source File Path:} {bold.underline ${resource.rawPath}}`
    );
    stop(chalk`  {bold.dim Error Message:} {bold ${error}}`);
  }
}

export default reportError;
