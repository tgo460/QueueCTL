const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

const PID_DIR = path.join(process.cwd(), 'pidfiles');

function start(count) {
    if (!fs.existsSync(PID_DIR)) {
        fs.mkdirSync(PID_DIR);
    }

    for (let i = 0; i < count; i++) {
        const worker = fork(path.join(__dirname, 'worker.js'));
        const pidFile = path.join(PID_DIR, `worker.${worker.pid}.pid`);
        fs.writeFileSync(pidFile, worker.pid.toString());
        console.log(`Started worker with PID: ${worker.pid}`);
    }
}

function stop() {
    if (!fs.existsSync(PID_DIR)) {
        console.log('No pidfiles directory found. No workers to stop.');
        return;
    }

    const pidFiles = fs.readdirSync(PID_DIR);
    pidFiles.forEach(file => {
        if (file.endsWith('.pid')) {
            try {
                const pid = parseInt(fs.readFileSync(path.join(PID_DIR, file), 'utf8'), 10);
                process.kill(pid, 'SIGTERM');
                fs.unlinkSync(path.join(PID_DIR, file));
                console.log(`Sent SIGTERM to worker ${pid}`);
            } catch (err) {
                console.error(`Failed to stop worker for pidfile ${file}:`, err.message);
                // Clean up stale pidfile
                if (err.code === 'ESRCH') {
                    fs.unlinkSync(path.join(PID_DIR, file));
                }
            }
        }
    });
}

module.exports = { start, stop };
