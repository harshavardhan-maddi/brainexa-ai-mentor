import pool from './server/db.js';

async function checkUserColumns() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Columns in users:', res.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
checkUserColumns();
