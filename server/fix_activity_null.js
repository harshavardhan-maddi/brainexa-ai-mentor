import pool from './db.js';

const fixActivityLogs = async () => {
  try {
    console.log('🛠️ Making columns nullable in activity_logs...');
    
    // Make type nullable since we use action now
    await pool.query(`
      ALTER TABLE activity_logs 
      ALTER COLUMN type DROP NOT NULL,
      ALTER COLUMN action DROP NOT NULL;
    `);

    console.log('✅ Activity logs table updated!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
};

fixActivityLogs();
