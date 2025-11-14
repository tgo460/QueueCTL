#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const enqueueCommand = require('./cli/enqueue');
// Placeholder for other commands
const workerCommand = require('./cli/worker');
const statusCommand = require('./cli/status');
const { dlqListCommand, dlqRetryCommand } = require('./cli/dlq');

yargs(hideBin(process.argv))
  .command(enqueueCommand)
  .command(workerCommand)
  .command(statusCommand)
  .command(statusCommand.listCommand)
  .command(dlqListCommand)
  .command(dlqRetryCommand)
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .argv;
