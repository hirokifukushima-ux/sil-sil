const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function setupTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vlytixemvzmtoabvtnod.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('📊 Supabaseに接続中...');
  console.log('URL:', supabaseUrl);

  // SQLファイルを読み込む
  const sql = fs.readFileSync('./supabase-schema.sql', 'utf8');

  // SQLを個別のステートメントに分割
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`\n実行するSQL文: ${statements.length}個\n`);

  // 各SQLステートメントを順番に実行
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // コメント行をスキップ
    if (statement.startsWith('--')) continue;

    console.log(`[${i + 1}/${statements.length}] 実行中...`);
    console.log(statement.substring(0, 80) + '...\n');

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_string: statement
      });

      if (error) {
        console.error(`❌ エラー:`, error.message);
        console.error('詳細:', error);

        // テーブルが既に存在する場合はスキップ
        if (error.message.includes('already exists')) {
          console.log('✓ 既に存在するのでスキップ\n');
          continue;
        }

        // 続行するか確認
        // throw error;
      } else {
        console.log('✓ 成功\n');
      }
    } catch (e) {
      console.error('❌ 実行エラー:', e.message);
    }
  }

  console.log('\n✅ セットアップ完了！');
}

// .env.localを読み込む
require('dotenv').config({ path: '.env.local' });

setupTables().catch(console.error);
