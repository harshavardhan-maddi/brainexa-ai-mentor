import db from './server/db.js';
import initDB from './server/init-db.js';

const run = async () => {
  const tables = ['chat_history', 'progress', 'quiz_results', 'study_plans', 'topics', 'subjects', 'users'];
  for (const table of tables) {
    try {
      await db.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log('Dropped ' + table);
    } catch (e) {
      console.error('Failed to drop ' + table + ': ' + e.message);
    }
  }

  console.log('Tables dropped. Re-initializing DB...');
  await initDB();
  console.log('DB init complete.');
  process.exit(0);
};

run().catch(console.error);
