// PostgreSQL直接接続でマイグレーション実行
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432,  // Session Pooler (DDL operations用)
  database: 'postgres',
  user: 'postgres.vlytixemvzmtoabvtnod',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function executeMigration() {
  console.log('🚀 マイグレーション実行開始...\n');

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // マイグレーションSQLを読み込み
    const sqlPath = path.join(__dirname, 'supabase/migrations/20251206000001_add_invitation_type.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 実行するSQL:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('');

    // SQLを実行
    const result = await client.query(sql);

    console.log('✅ マイグレーション実行完了！\n');

    // 結果を確認
    if (result.rows && result.rows.length > 0) {
      console.log('📋 実行結果:');
      console.table(result.rows);
    }

    // 全ての招待コードを確認
    console.log('\n📊 全招待コードの状態:');
    const checkResult = await client.query(`
      SELECT code, type, status, target_type, created_at
      FROM invitations
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(checkResult.rows);

    console.log('\n🎉 マイグレーション完了！typeカラムが追加され、teleportがpublicに設定されました。');

  } catch (error) {
    console.error('❌ マイグレーション実行エラー:');
    console.error(error.message);

    if (error.code === '42701') {
      console.log('\n💡 typeカラムは既に存在します。問題ありません。');
    } else if (error.code) {
      console.log(`\nエラーコード: ${error.code}`);
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

executeMigration();
