# QueueCTL

A simple, CLI-based background job queue built in Node.js with SQLite for persistence.

## Features

- **Enqueue Jobs**: Add shell commands as jobs to the queue.
- **Multiple Workers**: Run multiple local worker processes to execute jobs concurrently.
- **SQLite Persistence**: Jobs are stored in a local SQLite database and survive application restarts.
- **Retry with Exponential Backoff**: Failed jobs are automatically retried with increasing delays.
- **Dead Letter Queue (DLQ)**: Jobs that fail repeatedly are moved to a DLQ for manual inspection and retry.
- **Graceful Shutdown**: Workers can be stopped gracefully, allowing them to finish their current job.
- **Status Monitoring**: View queue statistics and list jobs by state.

## Project Structure

```
.
├── LICENSE
├── README.md
├── migrations
│   └── 001_init.sql
├── package.json
├── pidfiles/
├── queue.db
├── scripts
│   └── test_flow.sh
└── src
    ├── cli
    │   ├── dlq.js
    │   ├── enqueue.js
    │   ├── status.js
    │   └── worker.js
    ├── cli.js
    ├── config.js
    ├── executor
    │   └── shell.js
    ├── store
    │   └── sql.js
    └── worker
        ├── manager.js
        └── worker.js
```

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/tgo460/QueueCTL.git
    cd QueueCTL
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Make the CLI executable (Linux/Mac):**
    ```bash
    chmod +x src/cli.js
    ```

    **On Windows**, use PowerShell or Command Prompt - no chmod needed. Run commands with:
    ```powershell
    node ./src/cli.js <command>
    ```

## Usage

The main command is `queuectl`, which is an alias for `src/cli.js`.

**Note:** On Windows, use `node ./src/cli.js` instead of `./src/cli.js`

### Enqueue a Job

Add a new job to the queue.

**Linux/Mac:**
```bash
./src/cli.js enqueue "<command>" [options]
```

**Windows (PowerShell):**
```powershell
node ./src/cli.js enqueue "<command>" [options]
```

**Examples:**

```bash
# Enqueue a simple echo command
node ./src/cli.js enqueue "echo 'Hello, World!'"

# Enqueue multiple jobs
node ./src/cli.js enqueue "echo 'Job 1'"
node ./src/cli.js enqueue "echo 'Job 2'"
node ./src/cli.js enqueue "echo 'Job 3'"

# Enqueue a job that will fail, with 2 retries
node ./src/cli.js enqueue "exit 1" --max-retries 2

# View help for enqueue command
node ./src/cli.js enqueue --help
```

### Start Workers

Start one or more worker processes to execute jobs.

**Examples:**

```bash
# Start a single worker
node ./src/cli.js worker start

# Start 3 workers for parallel processing
node ./src/cli.js worker start --count 3

# Start 4 workers
node ./src/cli.js worker start --count 4
```

**What happens:**
- Workers run in the background as child processes
- Each worker polls for pending jobs and executes them
- Multiple workers process jobs concurrently without duplication (SQL locking prevents race conditions)
- Worker PIDs are stored in `pidfiles/` directory

### Stop Workers

Stop all running workers gracefully. Workers will finish their current job before exiting.

```bash
node ./src/cli.js worker stop
```

**Graceful Shutdown:**
- Workers receive SIGTERM signal
- Current job completes before exit
- No jobs are interrupted mid-execution
- PID files are cleaned up automatically

### Check Queue Status

View a summary of jobs by state.

```bash
# Table format
node ./src/cli.js status

# JSON format (for scripting)
node ./src/cli.js status --json
```

**Table Output:**

```
┌────────────┬───────┐
│  (index)   │ Values│
├────────────┼───────┤
│  pending   │   0   │
│ processing │   0   │
│ completed  │   4   │
│   failed   │   0   │
│    dead    │   1   │
└────────────┴───────┘
```

**JSON Output:**

```json
{
  "pending": 0,
  "processing": 0,
  "completed": 4,
  "failed": 0,
  "dead": 1
}
```

### List Jobs

List jobs in a specific state with detailed information.

```bash
# List pending jobs
node ./src/cli.js list --state pending

# List completed jobs
node ./src/cli.js list --state completed

# List dead jobs
node ./src/cli.js list --state dead

# Limit results
node ./src/cli.js list --state completed --limit 5
```

**Available States:**
- `pending` - Waiting to be processed
- `processing` - Currently being executed
- `completed` - Successfully finished
- `failed` - Failed but will retry
- `dead` - Moved to DLQ after exhausting retries

### Dead Letter Queue (DLQ)

When a job exceeds its `max_retries`, it is moved to the `dead` state (DLQ).

**List Dead Jobs:**

```bash
node ./src/cli.js dlq list

# Limit results
node ./src/cli.js dlq list --limit 20
```

**Example Output:**

```
┌─────────┬────────────────────────────────────────┬──────────┬────────┬──────────┬─────────────┬─────────────────────────┬────────────┬───────────────────────────────────┐
│ (index) │ id                                     │ command  │ state  │ attempts │ max_retries │ created_at              │ run_after  │ last_error                        │
├─────────┼────────────────────────────────────────┼──────────┼────────┼──────────┼─────────────┼─────────────────────────┼────────────┼───────────────────────────────────┤
│ 0       │ '8c54380b-358a-4edb-8d0a-e5a0b9d7706b' │ 'exit 1' │ 'dead' │ 2        │ 2           │ '2025-11-14 08:37:31'   │ 1763109462 │ 'Command failed with exit code 1' │
└─────────┴────────────────────────────────────────┴──────────┴────────┴──────────┴─────────────┴─────────────────────────┴────────────┴───────────────────────────────────┘
```

**Retry a Dead Job:**

Manually retry a job from the DLQ. This resets its attempt count to 0 and moves it back to `pending` state.

```bash
node ./src/cli.js dlq retry <job-id>
```

**Example:**

```bash
# Get job ID from dlq list, then retry it
node ./src/cli.js dlq retry 8c54380b-358a-4edb-8d0a-e5a0b9d7706b
```

### Configuration

Manage persistent configuration via a `queuectl.config.json` file.

**Show Effective Configuration:**

Displays the current configuration, merged from defaults, `queuectl.config.json`, and environment variables (env > file > defaults).

```bash
node ./src/cli.js config show
```

**Example Output:**

```json
{
  "dbFile": "D:\\QueueCTL\\queue.db",
  "maxRetries": 5,
  "baseBackoffSeconds": 2,
  "maxBackoffSeconds": 300,
  "processingTimeoutSeconds": 60,
  "logLevel": "info"
}
```

**Set a Configuration Value:**

Persistently writes a key-value pair to `queuectl.config.json`.

```bash
node ./src/cli.js config set <key> <value>
```

**Examples:**

```bash
# Set the default max retries to 5
node ./src/cli.js config set max-retries 5

# Set base backoff to 3 seconds
node ./src/cli.js config set base-backoff-seconds 3

# Set max backoff to 600 seconds (10 minutes)
node ./src/cli.js config set max-backoff-seconds 600
```

**Available Configuration Keys:**
- `max-retries` - Default maximum retry attempts (default: 3)
- `base-backoff-seconds` - Base for exponential backoff (default: 2)
- `max-backoff-seconds` - Maximum backoff delay (default: 300)
- `processing-timeout-seconds` - Job timeout (default: 60)
- `db-file` - Database file path
- `log-level` - Logging level (default: 'info')

**Configuration Priority:**
1. Environment variables (highest)
2. `queuectl.config.json` file
3. Default values (lowest)

**Note:** Changes take effect for new worker processes. Restart workers to apply new configuration.

## Testing

### Automated Test Script

A bash test script is provided to verify core functionality.

**Linux/Mac/WSL:**
```bash
bash scripts/test_flow.sh
```

**Windows (Git Bash):**
```bash
bash scripts/test_flow.sh
```

**Windows (WSL):**
```bash
wsl bash scripts/test_flow.sh
```

This script will:
1. Enqueue a successful job and verify it completes
2. Enqueue a failing job and verify it moves to the DLQ
3. Retry a job from the DLQ and verify it becomes pending again

### Manual Testing Workflow

Test the complete workflow manually:

**1. Clean Start:**
```powershell
# Remove old database and PID files
Remove-Item -Force queue.db -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force pidfiles -ErrorAction SilentlyContinue
```

**2. Enqueue Jobs:**
```bash
node ./src/cli.js enqueue "echo 'Test job 1'"
node ./src/cli.js enqueue "echo 'Test job 2'"
node ./src/cli.js enqueue "exit 1" --max-retries 2
```

**3. Check Status:**
```bash
node ./src/cli.js status --json
# Should show: {"pending": 3, "processing": 0, "completed": 0, "failed": 0, "dead": 0}
```

**4. Start Workers:**
```bash
node ./src/cli.js worker start --count 2
# Wait a few seconds for processing
```

**5. Verify Results:**
```bash
# Check overall status
node ./src/cli.js status

# List completed jobs
node ./src/cli.js list --state completed

# List dead jobs (the failed job should be here)
node ./src/cli.js dlq list
```

**6. Test DLQ Retry:**
```bash
# Get job ID from dlq list output, then:
node ./src/cli.js dlq retry <job-id>

# Verify it's back in pending
node ./src/cli.js status --json
```

**7. Stop Workers:**
```bash
node ./src/cli.js worker stop
```

### Test Job Persistence

Verify jobs survive application restart:

```bash
# 1. Enqueue jobs
node ./src/cli.js enqueue "echo 'Persistent job 1'"
node ./src/cli.js enqueue "echo 'Persistent job 2'"

# 2. Check they're in database
node ./src/cli.js status

# 3. Close terminal or restart machine

# 4. After restart, check again
node ./src/cli.js status
# Jobs should still be there!

# 5. Start workers to process them
node ./src/cli.js worker start --count 1
```

### Test Multiple Workers

Verify concurrent job processing without duplication:

```bash
# Enqueue 10 jobs
for ($i=1; $i -le 10; $i++) { node ./src/cli.js enqueue "echo 'Job $i'" }

# Start 3 workers
node ./src/cli.js worker start --count 3

# Wait for processing
Start-Sleep -Seconds 5

# Check results - all should be completed with no duplicates
node ./src/cli.js status --json
node ./src/cli.js list --state completed

# Stop workers
node ./src/cli.js worker stop
```

### Test Exponential Backoff

Observe retry delays increasing exponentially:

```bash
# Enqueue a job that will fail
node ./src/cli.js enqueue "exit 1" --max-retries 3

# Start a worker and watch the output
node ./src/cli.js worker start --count 1

# You'll see:
# - Attempt 1: immediate retry after ~2 seconds
# - Attempt 2: retry after ~4 seconds (2^2)
# - Attempt 3: retry after ~8 seconds (2^3)
# - Then moved to DLQ
```

## Architecture

-   **CLI (`src/cli.js`, `src/cli/`)**: Uses `yargs` to parse commands and arguments. Each command is implemented in its own file.
-   **Store (`src/store/sql.js`)**: A data access layer using `better-sqlite3` for all database operations. It handles job creation, state updates, and queries. The schema is defined in `migrations/001_init.sql`.
-   **Worker (`src/worker/`)**:
    -   `manager.js`: Spawns and manages worker child processes. It creates PID files to track running workers.
    -   `worker.js`: The core worker loop. It fetches a pending job, executes it, and updates its status.
-   **Executor (`src/executor/shell.js`)**: Uses `child_process.spawn` to execute the job's command in a shell.
-   **Configuration (`src/config.js`)**: Provides default configuration values, which can be overridden by environment variables.

### Locking

To prevent multiple workers from picking up the same job, a locking mechanism is implemented directly in the `getNextPendingJob` SQL query. The `UPDATE ... RETURNING` statement atomically finds a pending job, updates its state to `processing`, and returns it to the worker in a single transaction.

### Retry Logic

When a job fails, the worker calculates the next run time using exponential backoff with jitter:
`delay = min(max_backoff, floor(base ** attempts)) + floor(random() * base)`

The job's state is set back to `pending`, and `run_after` is updated to the calculated time (as a Unix timestamp).

### Graceful Shutdown

Workers handle `SIGTERM` and `SIGINT` signals. When a shutdown signal is received, the worker will finish its currently executing job before exiting. This prevents jobs from being interrupted mid-run.
