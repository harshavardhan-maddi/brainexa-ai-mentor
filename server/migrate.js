import pool from './db.js';

const migrate = async () => {
  try {
    console.log('🚀 Starting migration...');

    // Add columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS study_start_date TEXT,
      ADD COLUMN IF NOT EXISTS study_end_date TEXT,
      ADD COLUMN IF NOT EXISTS syllabus_update_count INTEGER DEFAULT 0;
    `);
    console.log('✅ Updated users table');

    // Add date column to study_plans table
    await pool.query(`
      ALTER TABLE study_plans 
      ADD COLUMN IF NOT EXISTS date TEXT;
    `);
    console.log('✅ Updated study_plans table');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
