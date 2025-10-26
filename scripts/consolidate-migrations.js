#!/usr/bin/env node

/**
 * Migration Consolidation Script
 * Consolidates all migrations into the backend system and disables duplicates
 */

const fs = require('fs');
const path = require('path');

class MigrationConsolidator {
  constructor() {
    this.backendMigrationsDir = './backend/database/migrations';
    this.legacyMigrationsDir = './database/migrations';
    this.rootMigrationFiles = [
      'migrate-database.js',
      'migrate-groups.js',
      'migrate-groups-enhanced.js',
      'migrate-groups-rebuild.js',
      'migrate-daily-topics.js',
      'migrate-invite-expiration.js'
    ];
    this.legacyMigrationFiles = [
      'database/migrate.js',
      'database/sqlite-migrate.js',
      'database/auth-migrate.js',
      'database/auth-migrate.js'
    ];
    this.scriptsMigrationFiles = [
      'scripts/migration/migrate-database.js',
      'scripts/migration/migrate-groups.js',
      'scripts/migration/migrate-daily-topics.js'
    ];
  }

  async consolidate() {
    console.log('🚀 Starting migration consolidation...');
    
    try {
      // 1. Verify backend migration system exists
      await this.verifyBackendSystem();
      
      // 2. Disable legacy migration files
      await this.disableLegacyFiles();
      
      // 3. Create migration disable markers
      await this.createDisableMarkers();
      
      // 4. Update documentation
      await this.updateDocumentation();
      
      console.log('✅ Migration consolidation completed successfully!');
      
    } catch (error) {
      console.error('❌ Consolidation failed:', error);
      process.exit(1);
    }
  }

  async verifyBackendSystem() {
    console.log('🔍 Verifying backend migration system...');
    
    if (!fs.existsSync(this.backendMigrationsDir)) {
      throw new Error('Backend migration system not found!');
    }
    
    const migrationFiles = fs.readdirSync(this.backendMigrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`✅ Found ${migrationFiles.length} backend migrations:`, migrationFiles);
  }

  async disableLegacyFiles() {
    console.log('🚫 Disabling legacy migration files...');
    
    // Disable root migration files
    for (const file of this.rootMigrationFiles) {
      await this.disableFile(file, 'Root migration file - use backend system instead');
    }
    
    // Disable legacy database migration files
    for (const file of this.legacyMigrationFiles) {
      await this.disableFile(file, 'Legacy migration file - use backend system instead');
    }
    
    // Disable scripts migration files
    for (const file of this.scriptsMigrationFiles) {
      await this.disableFile(file, 'Scripts migration file - use backend system instead');
    }
  }

  async disableFile(filePath, reason) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⏭️  File not found: ${filePath}`);
      return;
    }
    
    // Create backup
    const backupPath = `${fullPath}.disabled.backup`;
    fs.copyFileSync(fullPath, backupPath);
    
    // Create disabled version
    const disabledContent = `#!/usr/bin/env node

/**
 * DISABLED MIGRATION FILE
 * 
 * Reason: ${reason}
 * Disabled on: ${new Date().toISOString()}
 * 
 * This file has been disabled as part of migration consolidation.
 * All migrations are now handled by the backend system.
 * 
 * To run migrations, use:
 * cd backend && npm run db:migrate
 * 
 * Original file backed up as: ${path.basename(backupPath)}
 */

console.log('❌ This migration file has been disabled.');
console.log('📝 Reason:', '${reason}');
console.log('🔧 Use backend migration system instead:');
console.log('   cd backend && npm run db:migrate');
console.log('');
console.log('📁 Original file backed up as: ${path.basename(backupPath)}');

process.exit(1);
`;

    fs.writeFileSync(fullPath, disabledContent);
    console.log(`✅ Disabled: ${filePath}`);
  }

  async createDisableMarkers() {
    console.log('📝 Creating disable markers...');
    
    // Create marker in legacy migrations directory
    const legacyMarkerPath = path.join(process.cwd(), this.legacyMigrationsDir, 'DISABLED.md');
    const legacyMarkerContent = `# Legacy Migrations Directory - DISABLED

This directory contains legacy PostgreSQL migrations that have been **DISABLED**.

## ⚠️ Important

**DO NOT USE** these migrations anymore. They have been consolidated into the backend system.

## 🔧 Current Migration System

All migrations are now handled by the backend system:

\`\`\`bash
cd backend
npm run db:migrate      # Run migrations
npm run db:status       # Check status
npm run db:drift-check  # Check for drift
npm run db:baseline     # Create baseline
\`\`\`

## 📁 Migration Location

Current migrations are located in: \`backend/database/migrations/\`

## 🔄 Migration History

- **2024-01-25**: Legacy PostgreSQL migrations converted to SQLite format
- **2024-01-25**: All migrations consolidated into backend system
- **2024-01-25**: This directory disabled to prevent conflicts

## 📚 Documentation

See \`backend/database/MIGRATION_GUIDE.md\` for complete migration documentation.
`;

    fs.writeFileSync(legacyMarkerPath, legacyMarkerContent);
    console.log(`✅ Created disable marker: ${legacyMarkerPath}`);
  }

  async updateDocumentation() {
    console.log('📚 Updating documentation...');
    
    // Update main README
    const readmePath = path.join(process.cwd(), 'README.md');
    if (fs.existsSync(readmePath)) {
      let readmeContent = fs.readFileSync(readmePath, 'utf8');
      
      // Add migration consolidation notice
      const consolidationNotice = `
## ⚠️ Migration System Update

**IMPORTANT**: All database migrations have been consolidated into the backend system.

### Before (Legacy)
- Multiple migration systems
- PostgreSQL and SQLite migrations
- Scattered migration files

### After (Consolidated)
- Single migration system in backend
- SQLite-only migrations
- Centralized migration management

### Migration Commands
\`\`\`bash
cd backend
npm run db:migrate      # Run migrations
npm run db:status       # Check status  
npm run db:drift-check  # Check for drift
npm run db:baseline     # Create baseline
\`\`\`

See \`backend/database/MIGRATION_GUIDE.md\` for complete documentation.
`;

      // Insert notice after the main description
      const insertPoint = readmeContent.indexOf('## 🚀 Quick Start');
      if (insertPoint !== -1) {
        readmeContent = readmeContent.slice(0, insertPoint) + 
                       consolidationNotice + '\n' + 
                       readmeContent.slice(insertPoint);
        fs.writeFileSync(readmePath, readmeContent);
        console.log('✅ Updated main README.md');
      }
    }
  }
}

// Run consolidation if called directly
if (require.main === module) {
  const consolidator = new MigrationConsolidator();
  consolidator.consolidate();
}

module.exports = MigrationConsolidator;
