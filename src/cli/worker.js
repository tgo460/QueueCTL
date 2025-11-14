const manager = require('../worker/manager');

module.exports = {
  command: 'worker <action>',
  desc: 'Manage workers',
  builder: (yargs) => {
    yargs
      .positional('action', {
        describe: 'The action to perform (start, stop)',
        choices: ['start', 'stop'],
      })
      .option('count', {
        alias: 'c',
        describe: 'Number of workers to start',
        type: 'number',
        default: 1,
      });
  },
  handler: (argv) => {
    switch (argv.action) {
      case 'start':
        manager.start(argv.count);
        break;
      case 'stop':
        manager.stop();
        break;
    }
  },
};
