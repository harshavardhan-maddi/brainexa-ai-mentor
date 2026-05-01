import pool from './server/db.js';

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'study_plans'");
    console.log('Columns in study_plans:', res.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
checkSchema();
