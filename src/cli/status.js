const { getStats, listJobs } = require('../store/sql');

module.exports = {
  command: 'status',
  desc: 'Show queue summary',
  builder: (yargs) => {
    yargs.option('json', {
      describe: 'Output as JSON',
      type: 'boolean',
    });
  },
  handler: (argv) => {
    const stats = getStats();
    if (argv.json) {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      console.table(stats);
    }
  },
};

const listCommand = {
    command: 'list',
    desc: 'List jobs by state',
    builder: (yargs) => {
        yargs
            .option('state', {
                describe: 'The state of jobs to list',
                choices: ['pending', 'processing', 'completed', 'failed', 'dead'],
                default: 'pending',
            })
            .option('limit', {
                describe: 'Number of jobs to list',
                type: 'number',
                default: 10,
            });
    },
    handler: (argv) => {
        const jobs = listJobs(argv.state, argv.limit);
        console.table(jobs);
    }
};

// This is a bit of a hack to export multiple commands from one file for yargs
// A better way would be to have a command builder that registers all commands.
// For this MVP, we'll just add it to the main cli.js
module.exports.listCommand = listCommand;
