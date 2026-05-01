import pool from './db.js';

async function migrate() {
  try {
    console.log('🚀 Starting Admin Migration...');

    // 1. Add columns to users
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Users table updated');

    // 2. Add opened_at to knowledge_logs (where research content is stored)
    await pool.query(`
      ALTER TABLE knowledge_logs 
      ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✅ knowledge_logs table updated');

    // 3. Create activity_logs if not exists (already in init-db but for safety)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ activity_logs table created');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
