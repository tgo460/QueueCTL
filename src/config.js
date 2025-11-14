const path = require('path');

const DEFAULTS = {
    DB_FILE: path.join(process.cwd(), 'queue.db'),
    MAX_RETRIES: 3,
    BASE_BACKOFF_SECONDS: 2,
    MAX_BACKOFF_SECONDS: 300,
    PROCESSING_TIMEOUT_SECONDS: 60,
    LOG_LEVEL: 'info',
};

function getConfig() {
    return {
        dbFile: process.env.QUEUECTL_DB_FILE || DEFAULTS.DB_FILE,
        maxRetries: parseInt(process.env.QUEUECTL_MAX_RETRIES, 10) || DEFAULTS.MAX_RETRIES,
        baseBackoffSeconds: parseInt(process.env.QUEUECTL_BASE_BACKOFF_SECONDS, 10) || DEFAULTS.BASE_BACKOFF_SECONDS,
        maxBackoffSeconds: parseInt(process.env.QUEUECTL_MAX_BACKOFF_SECONDS, 10) || DEFAULTS.MAX_BACKOFF_SECONDS,
        processingTimeoutSeconds: parseInt(process.env.QUEUECTL_PROCESSING_TIMEOUT_SECONDS, 10) || DEFAULTS.PROCESSING_TIMEOUT_SECONDS,
        logLevel: process.env.QUEUECTL_LOG_LEVEL || DEFAULTS.LOG_LEVEL,
    };
}

module.exports = getConfig();
