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

3.  **Make the CLI executable:**
    ```bash
    chmod +x src/cli.js
    ```

## Usage

The main command is `queuectl`, which is an alias for `src/cli.js`.

### Enqueue a Job

Add a new job to the queue.

```bash
./src/cli.js enqueue "<command>" [options]
```

**Example:**

```bash
# Enqueue a simple echo command
./src/cli.js enqueue "echo 'Hello, World!'"

# Enqueue a job that will fail, with 2 retries
./src/cli.js enqueue "exit 1" --max-retries 2
```

### Start Workers

Start one or more worker processes to execute jobs.

```bash
./src/cli.js worker start [options]
```

**Example:**

```bash
# Start a single worker
./src/cli.js worker start

# Start 4 workers
./src/cli.js worker start --count 4
```

Workers will automatically pick up pending jobs from the queue.

### Stop Workers

Stop all running workers gracefully.

```bash
./src/cli.js worker stop
```

### Check Queue Status

View a summary of jobs by state.

```bash
./src/cli.js status
```

**Example Output:**

```
┌────────────┬───────┐
│  (index)   │ Values│
├────────────┼───────┤
│  pending   │   0   │
│ processing │   0   │
│ completed  │   1   │
│   failed   │   0   │
│    dead    │   0   │
└────────────┴───────┘
```

### List Jobs

List jobs in a specific state.

```bash
./src/cli.js list --state <state>
```

**Example:**

```bash
# List completed jobs
./src/cli.js list --state completed
```

### Dead Letter Queue (DLQ)

When a job exceeds its `max_retries`, it is moved to the `dead` state.

**List Dead Jobs:**

```bash
./src/cli.js dlq list
```

**Retry a Dead Job:**

You can manually retry a job from the DLQ. This will reset its attempt count and move it back to the `pending` state.

```bash
./src/cli.js dlq retry <job-id>
```

## Testing

A simple test script is provided to verify the core functionality.

```bash
bash scripts/test_flow.sh
```

This script will:
1.  Enqueue a successful job and verify it completes.
2.  Enqueue a failing job and verify it moves to the DLQ.
3.  Retry a job from the DLQ and verify it becomes pending again.

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
`delay = min(max_backoff, base ** attempts) + jitter`

The job's state is set back to `pending`, and `run_after` is updated to the calculated time.