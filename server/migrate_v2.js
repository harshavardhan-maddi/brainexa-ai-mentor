import pool from './db.js';

const migrate = async () => {
  try {
    console.log('🚀 Starting second migration...');

    // Add columns for allowance and rules
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS syllabus_update_allowance INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS rules_accepted BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Updated users table for allowance and rules');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
