const path = require('path');
const fs = require('fs');

const DEFAULTS = {
    dbFile: path.join(process.cwd(), 'queue.db'),
    maxRetries: 3,
    baseBackoffSeconds: 2,
    maxBackoffSeconds: 300,
    processingTimeoutSeconds: 60,
    logLevel: 'info',
};

function readLocalConfig() {
    try {
        const cfgPath = path.join(process.cwd(), 'queuectl.config.json');
        if (fs.existsSync(cfgPath)) {
            return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        }
    } catch (err) {
        // ignore malformed local config and fall back to defaults/env
    }
    return {};
}

function getConfig() {
    const local = readLocalConfig();

    return {
        dbFile: process.env.QUEUECTL_DB_FILE || local.dbFile || DEFAULTS.dbFile,
        maxRetries: parseInt(process.env.QUEUECTL_MAX_RETRIES, 10) || local.maxRetries || DEFAULTS.maxRetries,
        baseBackoffSeconds: parseInt(process.env.QUEUECTL_BASE_BACKOFF_SECONDS, 10) || local.baseBackoffSeconds || DEFAULTS.baseBackoffSeconds,
        maxBackoffSeconds: parseInt(process.env.QUEUECTL_MAX_BACKOFF_SECONDS, 10) || local.maxBackoffSeconds || DEFAULTS.maxBackoffSeconds,
        processingTimeoutSeconds: parseInt(process.env.QUEUECTL_PROCESSING_TIMEOUT_SECONDS, 10) || local.processingTimeoutSeconds || DEFAULTS.processingTimeoutSeconds,
        logLevel: process.env.QUEUECTL_LOG_LEVEL || local.logLevel || DEFAULTS.logLevel,
    };
}

module.exports = getConfig();
