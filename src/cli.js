#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const enqueueCommand = require('./cli/enqueue');
const workerCommand = require('./cli/worker');
const statusCommand = require('./cli/status');
const dlqCommand = require('./cli/dlq');
const configCommand = require('./cli/config');

yargs(hideBin(process.argv))
  .command(enqueueCommand)
  .command(workerCommand)
  .command(statusCommand)
  .command(statusCommand.listCommand)
  .command(dlqCommand)
  .command(configCommand)
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .argv;
