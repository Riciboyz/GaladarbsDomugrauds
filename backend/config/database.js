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
    '003_add_user_settings.sql'
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

  db.exec(bootstrapSql, (err) => {
    if (err) console.error('Schema bootstrap:', err.message);
  });

  return { db, dbPath };
}

module.exports = { initDatabase };
