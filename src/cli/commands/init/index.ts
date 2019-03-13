import yargs from 'yargs';
import Init from './Init';

function run() {
  const init = new Init({
    name: 'init',
    argv: yargs.argv
  });

  init.run();
}

export default run;
