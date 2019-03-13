import { start, stop } from '@shared/spinner';
import chalk from 'chalk';
import { spawn } from 'child_process';

function exec(command: string, args: string[]) {
  return new Promise((resolve, reject) => {
    const commandStr = `${command} ${args.join(' ')}`;

    start(chalk`{bold executing {cyan ${commandStr}}}`);

    const cp = spawn(command, args);

    cp.on('error', err => {
      stop(`${commandStr} exit with error ${err}`);
      process.exit(0);
    });

    cp.on('close', code => {
      if (code === 0) {
        stop(chalk`{bold execute {cyan ${commandStr}} successfully!}`);
        resolve();
      } else {
        stop(`${commandStr} exit with code ${code}`);
        process.exit(0);
      }
    });
  });
}

export default exec;
