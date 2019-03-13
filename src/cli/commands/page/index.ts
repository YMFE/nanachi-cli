import yargs from 'yargs';
import Page from './Page';

function run() {
  const page = new Page({
    name: 'page',
    argv: yargs.argv
  });

  page.run();
}

export default run;
