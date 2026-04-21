import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const CONNECTION_STRING = 'postgresql://postgres:y.PPjG!PZ6BFNFa@db.yigwmojgsrpolycqckab.supabase.co:5432/postgres';

const MIGRATIONS = [
  '00020_shops.sql',
  '00021_nearby_sessions_shop.sql',
  '00022_lfg_posts.sql',
  '00023_lfg_days_of_week.sql',
  '00024_fix_shop_coords.sql',
  '00025_shops_lat_lng_columns.sql',
  '00026_shops_all_tcgs.sql',
  '00027_notification_chat_fix.sql',
  '00028_notification_upsert.sql',
];

const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Verbunden mit Supabase.\n');

  for (const file of MIGRATIONS) {
    const path = join(__dirname, 'supabase', 'migrations', file);
    const sql = readFileSync(path, 'utf8');
    process.stdout.write(`▶ ${file} ... `);
    try {
      await client.query(sql);
      console.log('✓ OK');
    } catch (err) {
      console.log(`✗ FEHLER`);
      console.error(`  ${err.message}\n`);
    }
  }

  await client.end();
  console.log('\nFertig.');
}

run().catch(err => {
  console.error('Verbindungsfehler:', err.message);
  process.exit(1);
});
