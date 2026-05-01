import pool from './server/db.js';

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_change_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        old_email TEXT NOT NULL,
        new_email TEXT NOT NULL,
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ email_change_logs table created');
  } catch(e) {
    console.error('Migration error:', e.message);
  } finally {
    process.exit();
  }
}
migrate();
