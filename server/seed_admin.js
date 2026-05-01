import pool from './db.js';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  const email = 'admin@brainexa.com';
  const password = 'admin123';
  const name = 'System Administrator';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE users SET password = $1, role = $2, name = $3 WHERE email = $4',
        [hashedPassword, 'admin', name, email]
      );
      console.log('✅ Admin user updated');
    } else {
      await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        [name, email, hashedPassword, 'admin']
      );
      console.log('✅ Admin user created');
    }
    
    console.log('\n--- Admin Credentials ---');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-------------------------\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedAdmin();
