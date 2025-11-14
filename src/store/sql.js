const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_FILE = process.env.QUEUECTL_DB_FILE || path.join(process.cwd(), 'queue.db');

let db;

function connect() {
  if (db) return db;
  const dbExists = fs.existsSync(DB_FILE);
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  if (!dbExists) {
    console.log('Database does not exist, running migrations...');
    runMigrations(db);
  }
  return db;
}

function runMigrations(dbInstance) {
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).sort();
  for (const file of migrationFiles) {
    if (file.endsWith('.sql')) {
      const script = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      dbInstance.exec(script);
    }
  }
}

function enqueueJob(job) {
    const db = connect();
    const stmt = db.prepare(
        'INSERT INTO jobs (id, command, max_retries) VALUES (@id, @command, @max_retries)'
    );
    return stmt.run(job);
}

function getJob(id) {
    const db = connect();
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    return stmt.get(id);
}

function getNextPendingJob() {
    const db = connect();
    const stmt = db.prepare(`
        UPDATE jobs
        SET state = 'processing', updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now'), worker_id = ?
        WHERE id = (
            SELECT id FROM jobs
            WHERE state = 'pending' AND run_after <= strftime('%s', 'now')
            ORDER BY created_at
            LIMIT 1
        )
        RETURNING *
    `);
    return stmt.get(process.pid);
}

function updateJobState(id, state, lastError = null) {
    const db = connect();
    const stmt = db.prepare(
        "UPDATE jobs SET state = ?, last_error = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = ?"
    );
    return stmt.run(state, lastError, id);
}

function rescheduleJob(id, runAfter, attempts) {
    const db = connect();
    const stmt = db.prepare(
        "UPDATE jobs SET state = 'pending', run_after = ?, attempts = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = ?"
    );
    return stmt.run(runAfter, attempts, id);
}

function markJobDead(id, lastError) {
    return updateJobState(id, 'dead', lastError);
}

function getStats() {
    const db = connect();
    const rows = db.prepare(`
        SELECT state, COUNT(*) as count
        FROM jobs
        GROUP BY state
    `).all();

    const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        dead: 0,
    };

    rows.forEach(row => {
        stats[row.state] = row.count;
    });

    return stats;
}

function listJobs(state, limit) {
    const db = connect();
    const stmt = db.prepare('SELECT * FROM jobs WHERE state = ? LIMIT ?');
    return stmt.all(state, limit);
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  connect,
  close,
  enqueueJob,
  getJob,
  getNextPendingJob,
  updateJobState,
  rescheduleJob,
  markJobDead,
  getStats,
  listJobs,
};
