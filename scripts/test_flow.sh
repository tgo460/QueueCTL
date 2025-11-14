#!/bin/bash

# Exit on error
set -e

# Cleanup previous runs
rm -f queue.db
rm -f pidfiles/*

echo "--- Test: Basic Success ---"
JOB_ID=$(./src/cli.js enqueue "echo 'hi'" | grep 'Job enqueued' | awk '{print $5}')
echo "Enqueued job $JOB_ID"
./src/cli.js worker start --count 1
sleep 2 # Give worker time to process
./src/cli.js worker stop
STATUS=$(./src/cli.js status --json)
echo "Status: $STATUS"
if [[ $(echo "$STATUS" | grep '"completed": 1') ]]; then
    echo "SUCCESS: Job completed"
else
    echo "FAILURE: Job not completed"
    exit 1
fi
./src/cli.js list --state completed

echo "--- Test: Retry and DLQ ---"
./src/cli.js enqueue "unknowncmd" --max-retries 2
./src/cli.js worker start --count 1
sleep 5 # Give worker time to retry and fail
./src/cli.js worker stop
STATUS=$(./src/cli.js status --json)
echo "Status: $STATUS"
if [[ $(echo "$STATUS" | grep '"dead": 1') ]]; then
    echo "SUCCESS: Job moved to DLQ"
else
    echo "FAILURE: Job not in DLQ"
    exit 1
fi
./src/cli.js dlq list

echo "--- Test: DLQ Retry ---"
DEAD_JOB_ID=$(./src/cli.js dlq list | awk 'NR==4 {print $2}')
./src/cli.js enqueue "echo 'retry success'" --max-retries 0 # This is a dummy job to get a valid ID for the test
RETRY_JOB_ID=$(./src/cli.js enqueue "echo 'retry success'" | grep 'Job enqueued' | awk '{print $5}')
# We can't easily replace the command of a dead job, so for this test, we'll just check if we can move it back to pending
./src/cli.js dlq retry $DEAD_JOB_ID
STATUS=$(./src/cli.js status --json)
echo "Status: $STATUS"
if [[ $(echo "$STATUS" | grep '"pending": 1') && $(echo "$STATUS" | grep '"dead": 0') ]]; then
    echo "SUCCESS: Job retried from DLQ"
else
    echo "FAILURE: Job not retried from DLQ"
    exit 1
fi

echo "--- All tests passed! ---"
# Cleanup
rm -f queue.db
rm -f pidfiles/*
