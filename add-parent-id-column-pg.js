const { Client } = require('pg');
const fs = require('fs');

async function addParentIdColumn() {
  // 環境変数からパスワードを取得
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) {
    console.error('❌ SUPABASE_DB_PASSWORD 環境変数が設定されていません');
    console.error('\n以下のコマンドでパスワードを設定してから再実行してください:');
    console.error('export SUPABASE_DB_PASSWORD="your-database-password"');
    console.error('\nパスワードは Supabase Dashboard > Project Settings > Database > Connection string から取得できます');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres.vlytixemvzmtoabvtnod:${password}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;

  console.log('📊 Supabaseデータベースに接続中...');

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('✅ 接続成功\n');

    // SQLファイルを読み込む
    const sql = fs.readFileSync('./final-fixes.sql', 'utf8');

    console.log('実行するSQL:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log();

    // SQLを実行
    console.log('SQL実行中...');
    const result = await client.query(sql);

    console.log('✅ SQL実行成功！');
    console.log('結果:', result);
    console.log('\n✅ parent_idカラムの追加が完了しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error('メッセージ:', error.message);
    console.error('詳細:', error);

    // カラムが既に存在する場合
    if (error.message.includes('already exists')) {
      console.log('\n✓ parent_idカラムは既に存在します');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('\n接続を閉じました');
  }
}

addParentIdColumn().catch(console.error);
