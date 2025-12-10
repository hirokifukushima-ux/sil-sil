require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) {
    throw new Error('SUPABASE_DB_PASSWORD is not set in .env.local');
  }

  const pool = new Pool({
    connectionString: `postgresql://postgres.vlytixemvzmtoabvtnod:${password}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 マイグレーション開始...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/add-token-limits.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);

    console.log('✅ マイグレーション完了！');
    console.log('📊 追加されたカラム:');
    console.log('  - total_tokens_used (累計トークン使用量)');
    console.log('  - token_limit (月間上限: デフォルト50,000トークン)');
    console.log('  - tokens_reset_at (次回リセット日時)');

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
