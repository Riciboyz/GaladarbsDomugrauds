const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'threads_app.db');

console.log('Starting groups migration...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Migration steps
const migrations = [
  // Update groups table to use is_private instead of is_public
  `ALTER TABLE groups ADD COLUMN is_private BOOLEAN DEFAULT 0`,
  
  // Add members column to groups table
  `ALTER TABLE groups ADD COLUMN members TEXT DEFAULT '[]'`,
  
  // Update existing groups to have is_private = 0 (public) and members = creator
  `UPDATE groups SET is_private = 0, members = '["' || created_by || '"]' WHERE is_private IS NULL`,
  
  // Add group_messages table
  `CREATE TABLE IF NOT EXISTS group_messages (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    attachment_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  // Add group_invitations table
  `CREATE TABLE IF NOT EXISTS group_invitations (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    inviter_id VARCHAR(36) NOT NULL,
    invitee_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, invitee_id)
  )`,
  
  // Update notifications table to support group notifications
  `ALTER TABLE notifications ADD COLUMN type VARCHAR(50)`,
  
  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender_id)`,
  `CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_group_invitations_inviter ON group_invitations(inviter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee ON group_invitations(invitee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_groups_private ON groups(is_private)`
];

let currentMigration = 0;

function runNextMigration() {
  if (currentMigration >= migrations.length) {
    console.log('All migrations completed successfully!');
    db.close();
    return;
  }

  const migration = migrations[currentMigration];
  console.log(`Running migration ${currentMigration + 1}/${migrations.length}: ${migration.substring(0, 50)}...`);

  db.run(migration, (err) => {
    if (err) {
      // Some migrations might fail if they already exist, which is okay
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log(`Migration ${currentMigration + 1} skipped (already exists)`);
      } else {
        console.error(`Migration ${currentMigration + 1} failed:`, err.message);
      }
    } else {
      console.log(`Migration ${currentMigration + 1} completed successfully`);
    }
    
    currentMigration++;
    runNextMigration();
  });
}

// Start migrations
runNextMigration();
