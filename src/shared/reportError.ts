import FileResource from '@resources/FileResource';
import { ResourceState } from '@resources/Resource';
import chalk from 'chalk';
import { log, stop } from './spinner';

function reportError(resource: FileResource) {
  if (resource.state === ResourceState.Error) {
    const error = resource.error!.toString();

    log(chalk`{red.bold CompileError:}`);
    log(
      chalk`  {bold.dim SourceFilePath:} {bold.underline ${resource.rawPath}}`
    );
    stop(chalk`  {bold.dim ErrorMessage:} {bold ${error}}`);
  }
}

export default reportError;
