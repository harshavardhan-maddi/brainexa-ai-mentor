import pool from './server/db.js';

async function testQuery() {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.created_at, u.role, u.is_blocked,
        p.study_progress, p.updated_at as last_active,
        (SELECT json_agg(name) FROM subjects WHERE user_id = u.id) as subjects,
        (SELECT created_at FROM activity_logs WHERE user_id = u.id AND action = 'login' ORDER BY created_at DESC LIMIT 1) as last_login,
        (SELECT created_at FROM activity_logs WHERE user_id = u.id AND action = 'logout' ORDER BY created_at DESC LIMIT 1) as last_logout
      FROM users u
      LEFT JOIN progress p ON u.id = p.user_id
      WHERE u.role != 'admin' OR u.role IS NULL
      ORDER BY u.created_at DESC
    `);
    console.log('✅ Query success, rows:', result.rows.length);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    if (error.hint) console.log('Hint:', error.hint);
  }
  process.exit();
}

testQuery();
