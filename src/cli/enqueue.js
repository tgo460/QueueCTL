const { enqueueJob } = require('../store/sql');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

module.exports = {
  command: 'enqueue <command>',
  desc: 'Enqueue a new job',
  builder: (yargs) => {
    yargs
      .positional('command', {
        describe: 'The command to execute',
        type: 'string',
      })
      .option('json', {
        describe: 'Job data as a JSON string',
        type: 'string',
      })
      .option('file', {
        describe: 'Path to a JSON file with job data',
        type: 'string',
      })
      .option('max-retries', {
        describe: 'Maximum number of retries for the job',
        type: 'number',
        default: 3,
      });
  },
  handler: (argv) => {
    let jobData = {};
    if (argv.json) {
      jobData = JSON.parse(argv.json);
    } else if (argv.file) {
      jobData = JSON.parse(fs.readFileSync(argv.file, 'utf8'));
    }

    const job = {
      id: uuidv4(),
      command: argv.command,
      max_retries: argv.maxRetries,
      ...jobData,
    };

    try {
      enqueueJob(job);
      console.log(`Job enqueued with ID: ${job.id}`);
    } catch (error) {
      console.error('Failed to enqueue job:', error.message);
    }
  },
};
