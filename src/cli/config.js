// filepath: d:/QueueCTL/src/cli/config.js
const fs = require('fs');
const path = require('path');
const currentConfig = require('../config');

const CFG_PATH = path.join(process.cwd(), 'queuectl.config.json');

function readConfigFile() {
  try {
    if (fs.existsSync(CFG_PATH)) {
      return JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read config file:', err.message);
  }
  return {};
}

function writeConfigFile(obj) {
  try {
    fs.writeFileSync(CFG_PATH, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write config file:', err.message);
    return false;
  }
}

const allowedKeys = {
  'max-retries': 'maxRetries',
  'base-backoff-seconds': 'baseBackoffSeconds',
  'max-backoff-seconds': 'maxBackoffSeconds',
  'processing-timeout-seconds': 'processingTimeoutSeconds',
  'db-file': 'dbFile',
  'log-level': 'logLevel',
  // allow camelCase keys too
  'maxRetries': 'maxRetries',
  'baseBackoffSeconds': 'baseBackoffSeconds',
  'maxBackoffSeconds': 'maxBackoffSeconds',
  'processingTimeoutSeconds': 'processingTimeoutSeconds',
  'dbFile': 'dbFile',
  'logLevel': 'logLevel',
};

module.exports = {
  command: 'config <action>',
  desc: 'Manage configuration',
  builder: (yargs) => {
    yargs
      .command({
        command: 'show',
        desc: 'Show effective configuration (env, local config, defaults)',
        handler: () => {
          const local = readConfigFile();
          const cfg = Object.assign({}, currentConfig, local);
          console.log(JSON.stringify(cfg, null, 2));
        },
      })
      .command({
        command: 'set <key> <value>',
        desc: 'Set a configuration key persistently (writes queuectl.config.json)',
        builder: (yargs) => {
          yargs.positional('key', { describe: 'Config key', type: 'string' });
          yargs.positional('value', { describe: 'Config value', type: 'string' });
        },
        handler: (argv) => {
          const provided = argv.key;
          const mapped = allowedKeys[provided];
          if (!mapped) {
            console.error('Unknown config key. Allowed keys:', Object.keys(allowedKeys).join(', '));
            return;
          }

          const local = readConfigFile();

          // Convert numeric values where applicable
          let value = argv.value;
          if (['maxRetries', 'baseBackoffSeconds', 'maxBackoffSeconds', 'processingTimeoutSeconds'].includes(mapped)) {
            const n = parseInt(value, 10);
            if (Number.isNaN(n)) {
              console.error('Value must be a number for key', provided);
              return;
            }
            value = n;
          }

          local[mapped] = value;
          if (writeConfigFile(local)) {
            console.log(`Wrote ${provided} = ${value} to ${CFG_PATH}`);
          }
        },
      })
      .demandCommand(1, 'Please specify an action: show or set');
  },
  handler: () => {}
};
