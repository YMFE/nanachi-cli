import yargs from 'yargs';
import Component from './Component';

function run() {
  const component = new Component({
    name: 'component',
    argv: yargs.argv
  });

  component.run();
}

export default run;
