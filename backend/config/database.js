const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function initDatabase() {
  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.join(process.cwd(), '..', 'threads_app.db');

  const db = new sqlite3.Database(dbPath);

  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_add_group_roles.sql',
    '003_add_user_settings.sql',
    '004_admin_moderation.sql',
    '005_make_groups_public.sql',
    '006_suggestions.sql'
  ];

  let bootstrapSql = '';
  for (const f of migrationFiles) {
    const fp = path.join(migrationsDir, f);
    if (fs.existsSync(fp)) {
      bootstrapSql += fs.readFileSync(fp, 'utf8') + '\n';
    }
  }

  bootstrapSql += `
CREATE TABLE IF NOT EXISTS followers (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id)
);
`;

  return new Promise((resolve) => {
    db.exec(bootstrapSql, async (err) => {
      if (err) console.error('Schema bootstrap:', err.message);
      try {
        await ensureAdminModerationPatches(db);
      } catch (e) {
        console.error('Schema patches:', e.message);
      }
      resolve({ db, dbPath });
    });
  });
}

function columnNames(rows) {
  return new Set((rows || []).map((r) => r.name));
}

/** Idempotent ALTERs for SQLite (bootstrap re-runs migrations). Must finish before API traffic. */
async function ensureAdminModerationPatches(db) {
  const run = (sql) =>
    new Promise((resolve, reject) => {
      db.run(sql, (e) => (e ? reject(e) : resolve()));
    });

  const all = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows)));
    });

  try {
    const userCols = columnNames(await all('PRAGMA table_info(users)'));
    if (!userCols.has('last_active_at')) await run('ALTER TABLE users ADD COLUMN last_active_at DATETIME');
    if (!userCols.has('deleted_at')) await run('ALTER TABLE users ADD COLUMN deleted_at DATETIME');
    if (!userCols.has('deleted_by')) await run('ALTER TABLE users ADD COLUMN deleted_by TEXT');
    if (!userCols.has('banned_until')) await run('ALTER TABLE users ADD COLUMN banned_until DATETIME');
    if (!userCols.has('muted_until')) await run('ALTER TABLE users ADD COLUMN muted_until DATETIME');

    const topicCols = columnNames(await all('PRAGMA table_info(daily_topics)'));
    if (topicCols.size) {
      if (!topicCols.has('status')) {
        await run("ALTER TABLE daily_topics ADD COLUMN status TEXT DEFAULT 'published'");
      }
      await run("UPDATE daily_topics SET status = 'published' WHERE status IS NULL OR status = ''");
      await run('CREATE INDEX IF NOT EXISTS idx_daily_topics_date_status ON daily_topics(date, status)');
    }

    await run('CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)');
  } catch (e) {
    console.error('Schema patches (004):', e.message);
  }
}

module.exports = { initDatabase };
