import pool from './db.js';

const migrate = async () => {
  try {
    console.log('🚀 Starting third migration for Activity Logs...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL, -- 'task_completion', 'quiz_attempt', 'syllabus_update'
        subject TEXT,
        description TEXT,
        score INTEGER,
        total INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created activity_logs table');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
