import pool from './db.js';

const fixSchema = async () => {
  try {
    console.log('🛠️ Fixing activity_logs schema...');
    
    // Add missing columns if they don't exist
    await pool.query(`
      ALTER TABLE activity_logs 
      ADD COLUMN IF NOT EXISTS action TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);

    // Backfill action from type if null
    await pool.query(`
      UPDATE activity_logs SET action = type WHERE action IS NULL;
    `);

    console.log('✅ Schema fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  }
};

fixSchema();
