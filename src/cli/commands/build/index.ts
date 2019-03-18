import yargs from 'yargs';
import Build from './Build';

function run() {
  const build = new Build({
    name: 'Build',
    argv: yargs.argv
  });

  build.run();
}

export default run;
