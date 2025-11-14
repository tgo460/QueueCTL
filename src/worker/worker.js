const { getNextPendingJob, updateJobState, rescheduleJob, markJobDead } = require('../store/sql');
const { execute } = require('../executor/shell');
const config = require('../config');

async function processJob() {
    const job = getNextPendingJob();
    if (!job) {
        return false; // No job found
    }

    console.log(`Worker ${process.pid} processing job ${job.id}`);

    try {
        await execute(job.command);
        updateJobState(job.id, 'completed');
        console.log(`Job ${job.id} completed successfully.`);
    } catch (error) {
        handleFailedJob(job, error);
    }

    return true; // Job was processed
}

function handleFailedJob(job, error) {
    const attempts = job.attempts + 1;
    if (attempts >= job.max_retries) {
        markJobDead(job.id, error.stderr || error.message);
        console.error(`Job ${job.id} failed and moved to DLQ. Error: ${error.message}`);
    } else {
        const delay = Math.min(
            config.maxBackoffSeconds,
            config.baseBackoffSeconds ** attempts
        );
        const jitter = Math.random() * config.baseBackoffSeconds;
        const runAfter = Math.floor(Date.now() / 1000) + delay + jitter;
        
        rescheduleJob(job.id, runAfter, attempts);
        console.log(`Job ${job.id} failed, rescheduling for ${new Date(runAfter * 1000)}. Attempt ${attempts}/${job.max_retries}`);
    }
}

function startWorker() {
    console.log(`Worker ${process.pid} started.`);
    const loop = async () => {
        try {
            const processed = await processJob();
            if (!processed) {
                // If no job was found, wait a bit before polling again
                setTimeout(loop, 1000);
            } else {
                // If a job was processed, immediately look for the next one
                setImmediate(loop);
            }
        } catch (err) {
            console.error('Worker loop error:', err);
            setTimeout(loop, 5000); // Wait longer on error
        }
    };
    loop();
}

// If this file is run directly, start the worker
if (require.main === module) {
    startWorker();
}

module.exports = { startWorker };
