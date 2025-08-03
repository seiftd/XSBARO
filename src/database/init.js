const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DatabaseInitializer {
    constructor() {
        this.dbPath = process.env.DB_PATH || './data/sbrfarm.db';
        this.schemaPath = path.join(__dirname, 'schema.sql');
        
        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    async initialize() {
        try {
            console.log('🗄️  Initializing SBRFARM database...');
            
            const db = new sqlite3.Database(this.dbPath);
            
            // Read and execute schema
            const schema = fs.readFileSync(this.schemaPath, 'utf8');
            
            return new Promise((resolve, reject) => {
                db.exec(schema, (err) => {
                    if (err) {
                        console.error('❌ Database initialization failed:', err);
                        reject(err);
                    } else {
                        console.log('✅ Database initialized successfully');
                        
                        // Create default admin user if not exists
                        this.createDefaultAdmin(db, () => {
                            db.close();
                            resolve();
                        });
                    }
                });
            });
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    createDefaultAdmin(db, callback) {
        // Create a default admin user (replace with your Telegram ID)
        const defaultAdminId = 123456789; // Replace with actual admin Telegram ID
        const insertAdminQuery = `
            INSERT OR IGNORE INTO admin_users (telegram_id, username, role, permissions) 
            VALUES (?, ?, ?, ?)
        `;
        
        const permissions = JSON.stringify([
            'user_management',
            'vip_management',
            'contest_management',
            'financial_management',
            'system_settings',
            'analytics'
        ]);

        db.run(insertAdminQuery, [
            defaultAdminId,
            'admin',
            'admin',
            permissions
        ], (err) => {
            if (err) {
                console.error('❌ Failed to create default admin:', err);
            } else {
                console.log('👤 Default admin user created/verified');
            }
            callback();
        });
    }

    async backup() {
        try {
            const backupDir = process.env.DB_BACKUP_PATH || './data/backups/';
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `sbrfarm_backup_${timestamp}.db`);
            
            fs.copyFileSync(this.dbPath, backupPath);
            console.log(`📁 Database backup created: ${backupPath}`);
            
            // Keep only last 10 backups
            this.cleanupOldBackups(backupDir);
            
            return backupPath;
        } catch (error) {
            console.error('❌ Database backup failed:', error);
            throw error;
        }
    }

    cleanupOldBackups(backupDir) {
        try {
            const files = fs.readdirSync(backupDir)
                .filter(file => file.startsWith('sbrfarm_backup_') && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    mtime: fs.statSync(path.join(backupDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            // Keep only the 10 most recent backups
            if (files.length > 10) {
                const filesToDelete = files.slice(10);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️  Deleted old backup: ${file.name}`);
                });
            }
        } catch (error) {
            console.error('❌ Failed to cleanup old backups:', error);
        }
    }

    async verifyDatabase() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Verify key tables exist
            const checkTablesQuery = `
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN (
                    'users', 'user_resources', 'patches', 'seedlings', 
                    'vip_subscriptions', 'contests', 'transactions'
                )
            `;
            
            db.all(checkTablesQuery, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const expectedTables = [
                        'users', 'user_resources', 'patches', 'seedlings',
                        'vip_subscriptions', 'contests', 'transactions'
                    ];
                    
                    const existingTables = rows.map(row => row.name);
                    const missingTables = expectedTables.filter(table => 
                        !existingTables.includes(table)
                    );
                    
                    if (missingTables.length > 0) {
                        reject(new Error(`Missing tables: ${missingTables.join(', ')}`));
                    } else {
                        console.log('✅ Database verification passed');
                        resolve(true);
                    }
                }
                db.close();
            });
        });
    }
}

// CLI execution
if (require.main === module) {
    const initializer = new DatabaseInitializer();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'init':
            initializer.initialize()
                .then(() => {
                    console.log('🎉 Database initialization completed!');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('💥 Initialization failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'backup':
            initializer.backup()
                .then(backupPath => {
                    console.log(`🎉 Backup completed: ${backupPath}`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('💥 Backup failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'verify':
            initializer.verifyDatabase()
                .then(() => {
                    console.log('🎉 Database verification passed!');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('💥 Database verification failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log(`
📖 SBRFARM Database Management

Usage: node src/database/init.js [command]

Commands:
  init    - Initialize database with schema
  backup  - Create database backup
  verify  - Verify database integrity

Examples:
  node src/database/init.js init
  node src/database/init.js backup
  node src/database/init.js verify
            `);
            process.exit(0);
    }
}

module.exports = DatabaseInitializer;