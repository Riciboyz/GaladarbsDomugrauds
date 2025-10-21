const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'threads_app.db');

console.log('🧹 Cleaning up all old group invitations...');

const db = new sqlite3.Database(dbPath);

// First, let's see what we have
const checkQuery = `
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,
    COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as no_expiry
  FROM group_invitations
`;

db.get(checkQuery, (err, row) => {
  if (err) {
    console.error('❌ Error checking invitations:', err);
    process.exit(1);
  }
  
  console.log('📊 Current invitation stats:');
  console.log(`   Total: ${row.total}`);
  console.log(`   Pending: ${row.pending}`);
  console.log(`   Accepted: ${row.accepted}`);
  console.log(`   Declined: ${row.declined}`);
  console.log(`   No expiry date: ${row.no_expiry}`);
  
  // Delete ALL group invitations (they're old and not working)
  const deleteQuery = 'DELETE FROM group_invitations';
  
  db.run(deleteQuery, function(err) {
    if (err) {
      console.error('❌ Error deleting invitations:', err);
      process.exit(1);
    }
    
    console.log(`✅ Deleted ${this.changes} group invitations`);
    
    // Also clean up any related notifications
    const cleanupNotificationsQuery = `
      DELETE FROM notifications 
      WHERE type = 'group_invite'
    `;
    
    db.run(cleanupNotificationsQuery, function(err) {
      if (err) {
        console.error('❌ Error cleaning up notifications:', err);
        process.exit(1);
      }
      
      console.log(`🧹 Cleaned up ${this.changes} group invite notifications`);
      
      // Verify cleanup
      const verifyQuery = 'SELECT COUNT(*) as count FROM group_invitations';
      db.get(verifyQuery, (err, row) => {
        if (err) {
          console.error('❌ Error verifying cleanup:', err);
          process.exit(1);
        }
        
        console.log(`✅ Verification: ${row.count} invitations remaining`);
        
        if (row.count === 0) {
          console.log('🎉 All group invitations successfully cleaned up!');
        } else {
          console.log('⚠️ Some invitations still remain');
        }
        
        db.close();
        console.log('✅ Cleanup completed!');
      });
    });
  });
});
