import yargs from 'yargs';
import Help from './Help';

function run() {
  const help = new Help({ name: 'help', argv: yargs.argv });

  help.run();
}

export default run;
