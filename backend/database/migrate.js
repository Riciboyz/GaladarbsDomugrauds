#!/usr/bin/env node

/**
 * DomuGrauds Database Migration System
 * Consolidated migration system for backend
 */

const fs = require('fs');
const path = require('path');
const database = require('./db');

class MigrationManager {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'migrations');
    this.migrationsTable = 'schema_migrations';
  }

  async init() {
    console.log('🚀 Initializing DomuGrauds Migration System...');
    
    // Create migrations table
    await this.createMigrationsTable();
    
    // Ensure database schema exists
    await this.ensureDatabaseSchema();
  }

  async createMigrationsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version VARCHAR(50) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        description TEXT
      )
    `;
    
    await database.query(createTableSQL);
    console.log('✅ Migrations table created/verified');
  }

  async ensureDatabaseSchema() {
    // Create core tables if they don't exist
    const coreSchema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        bio TEXT,
        avatar TEXT,
        password_hash TEXT NOT NULL,
        following TEXT DEFAULT '[]',
        followers TEXT DEFAULT '[]',
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Email OTP table
      CREATE TABLE IF NOT EXISTS email_otps (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Threads table
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id TEXT,
        group_id TEXT,
        topic_day_id TEXT,
        visibility TEXT DEFAULT 'public',
        attachments TEXT DEFAULT '[]',
        likes TEXT DEFAULT '[]',
        dislikes TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES threads(id) ON DELETE CASCADE
      );

      -- Groups table
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        avatar TEXT,
        created_by TEXT NOT NULL,
        members TEXT DEFAULT '[]',
        visibility TEXT DEFAULT 'public',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Group invites table
      CREATE TABLE IF NOT EXISTS group_invites (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        invited_by TEXT NOT NULL,
        invited_user TEXT,
        invited_email TEXT,
        status TEXT DEFAULT 'pending',
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        read INTEGER DEFAULT 0,
        data TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Daily topics table
      CREATE TABLE IF NOT EXISTS daily_topics (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_by TEXT NOT NULL,
        participants TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Topic submissions table
      CREATE TABLE IF NOT EXISTS topic_submissions (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES daily_topics(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_threads_author_id ON threads(author_id);
      CREATE INDEX IF NOT EXISTS idx_threads_parent_id ON threads(parent_id);
      CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON email_otps(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_otps_code ON email_otps(code);
    `;

    await database.query(coreSchema);
    console.log('✅ Core database schema ensured');
  }

  async getExecutedMigrations() {
    const result = await database.query(`SELECT version FROM ${this.migrationsTable} ORDER BY version`);
    return result.rows.map(row => row.version);
  }

  async recordMigration(version, filename, description, checksum) {
    const sql = `
      INSERT INTO ${this.migrationsTable} (version, filename, description, checksum)
      VALUES (?, ?, ?, ?)
    `;
    await database.query(sql, [version, filename, description, checksum]);
  }

  async runMigrations() {
    console.log('🔄 Running pending migrations...');
    
    const executedMigrations = await this.getExecutedMigrations();
    
    // Get all migration files
    const migrationFiles = this.getMigrationFiles();
    
    for (const migration of migrationFiles) {
      if (!executedMigrations.includes(migration.version)) {
        console.log(`📝 Running migration: ${migration.version} - ${migration.description}`);
        
        try {
          await this.executeMigration(migration);
          await this.recordMigration(
            migration.version,
            migration.filename,
            migration.description,
            migration.checksum
          );
          console.log(`✅ Migration ${migration.version} completed`);
        } catch (error) {
          console.error(`❌ Migration ${migration.version} failed:`, error);
          throw error;
        }
      } else {
        console.log(`⏭️  Migration ${migration.version} already executed, skipping`);
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
  }

  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const version = filename.replace('.sql', '');
      const filepath = path.join(this.migrationsDir, filename);
      const content = fs.readFileSync(filepath, 'utf8');
      const checksum = this.calculateChecksum(content);
      
      // Extract description from SQL comment
      const descriptionMatch = content.match(/--\s*Description:\s*(.+)/i);
      const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description';

      return {
        version,
        filename,
        description,
        checksum,
        content
      };
    });
  }

  async executeMigration(migration) {
    // Split SQL by semicolon and execute each statement
    const statements = migration.content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        await database.query(statement);
      }
    }
  }

  calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async createBaseline() {
    console.log('📊 Creating baseline from current production schema...');
    
    // Get current schema
    const schema = await this.getCurrentSchema();
    
    // Create baseline migration file
    const baselineVersion = '000_baseline';
    const baselineFilename = `${baselineVersion}.sql`;
    const baselinePath = path.join(this.migrationsDir, baselineFilename);
    
    const baselineContent = `-- Migration: ${baselineVersion}
-- Description: Baseline schema from production
-- Created: ${new Date().toISOString().split('T')[0]}

${schema}`;

    fs.writeFileSync(baselinePath, baselineContent);
    console.log(`✅ Baseline created: ${baselineFilename}`);
    
    return baselineVersion;
  }

  async getCurrentSchema() {
    // Get table schemas
    const tables = await database.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    let schema = '';
    
    for (const table of tables.rows) {
      const tableName = table.name;
      
      // Get table schema
      const tableInfo = await database.query(`PRAGMA table_info(${tableName})`);
      
      schema += `-- Table: ${tableName}\n`;
      schema += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      
      const columns = tableInfo.rows.map(col => {
        let colDef = `  ${col.name} ${col.type}`;
        if (col.notnull) colDef += ' NOT NULL';
        if (col.pk) colDef += ' PRIMARY KEY';
        if (col.dflt_value !== null) colDef += ` DEFAULT ${col.dflt_value}`;
        return colDef;
      }).join(',\n');
      
      schema += columns + '\n);\n\n';
    }
    
    return schema;
  }

  async checkDrift() {
    console.log('🔍 Checking for schema drift...');
    
    const executedMigrations = await this.getExecutedMigrations();
    const migrationFiles = this.getMigrationFiles();
    
    const missingMigrations = migrationFiles.filter(
      migration => !executedMigrations.includes(migration.version)
    );
    
    if (missingMigrations.length > 0) {
      console.log('⚠️  Found missing migrations:');
      missingMigrations.forEach(migration => {
        console.log(`   - ${migration.version}: ${migration.description}`);
      });
      return false;
    }
    
    console.log('✅ No drift detected - all migrations are up to date');
    return true;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.init();
    
    switch (command) {
      case 'migrate':
        await migrationManager.runMigrations();
        break;
        
      case 'baseline':
        await migrationManager.createBaseline();
        break;
        
      case 'drift-check':
        const isClean = await migrationManager.checkDrift();
        process.exit(isClean ? 0 : 1);
        break;
        
      case 'status':
        const executed = await migrationManager.getExecutedMigrations();
        const available = migrationManager.getMigrationFiles();
        
        console.log('📊 Migration Status:');
        console.log(`   Executed: ${executed.length}`);
        console.log(`   Available: ${available.length}`);
        console.log(`   Pending: ${available.length - executed.length}`);
        
        if (executed.length < available.length) {
          console.log('\n⏳ Pending migrations:');
          available.forEach(migration => {
            const status = executed.includes(migration.version) ? '✅' : '⏳';
            console.log(`   ${status} ${migration.version}: ${migration.description}`);
          });
        }
        break;
        
      default:
        console.log('Usage: node migrate.js [migrate|baseline|drift-check|status]');
        console.log('');
        console.log('Commands:');
        console.log('  migrate     - Run pending migrations');
        console.log('  baseline    - Create baseline from current schema');
        console.log('  drift-check - Check for schema drift');
        console.log('  status      - Show migration status');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = MigrationManager;