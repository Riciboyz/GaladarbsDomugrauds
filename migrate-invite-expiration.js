const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'threads_app.db');

console.log('🔄 Migrating group invitations to add expiration...');

const db = new sqlite3.Database(dbPath);

// Update existing pending invitations to expire in 5 minutes from now
const updateQuery = `
  UPDATE group_invitations 
  SET expires_at = datetime('now', '+5 minutes')
  WHERE status = 'pending' AND expires_at IS NULL
`;

db.run(updateQuery, function(err) {
  if (err) {
    console.error('❌ Error updating invitations:', err);
    process.exit(1);
  }
  
  console.log(`✅ Updated ${this.changes} pending invitations with expiration time`);
  
  // Check if there are any expired invitations
  const checkExpiredQuery = `
    SELECT COUNT(*) as count 
    FROM group_invitations 
    WHERE status = 'pending' AND expires_at < datetime('now')
  `;
  
  db.get(checkExpiredQuery, (err, row) => {
    if (err) {
      console.error('❌ Error checking expired invitations:', err);
      process.exit(1);
    }
    
    console.log(`📊 Found ${row.count} expired invitations`);
    
    if (row.count > 0) {
      // Clean up expired invitations
      const cleanupQuery = `
        DELETE FROM group_invitations 
        WHERE status = 'pending' AND expires_at < datetime('now')
      `;
      
      db.run(cleanupQuery, function(err) {
        if (err) {
          console.error('❌ Error cleaning up expired invitations:', err);
          process.exit(1);
        }
        
        console.log(`🧹 Cleaned up ${this.changes} expired invitations`);
        db.close();
        console.log('✅ Migration completed successfully!');
      });
    } else {
      db.close();
      console.log('✅ Migration completed successfully!');
    }
  });
});
