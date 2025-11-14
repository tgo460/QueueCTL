const { listJobs, rescheduleJob, getJob } = require('../store/sql');

const dlqListCommand = {
  command: 'dlq list',
  desc: 'List dead jobs',
  builder: (yargs) => {
    yargs.option('limit', {
      describe: 'Number of jobs to list',
      type: 'number',
      default: 10,
    });
  },
  handler: (argv) => {
    const jobs = listJobs('dead', argv.limit);
    console.table(jobs);
  },
};

const dlqRetryCommand = {
    command: 'dlq retry <job-id>',
    desc: 'Retry a dead job',
    builder: (yargs) => {
        yargs.positional('job-id', {
            describe: 'The ID of the job to retry',
            type: 'string',
        });
    },
    handler: (argv) => {
        const job = getJob(argv.jobId);
        if (!job || job.state !== 'dead') {
            console.error('Job not found or not in DLQ.');
            return;
        }
        
        const runAfter = Math.floor(Date.now() / 1000);
        rescheduleJob(job.id, runAfter, 0); // Reset attempts to 0
        console.log(`Job ${job.id} has been rescheduled.`);
    }
};


module.exports = {
    dlqListCommand,
    dlqRetryCommand
};
