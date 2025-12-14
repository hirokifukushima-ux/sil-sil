const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 環境変数から Supabase 設定を読み込む
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase の設定が見つかりません');
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📊 パフォーマンス最適化マイグレーションを開始します...');
    console.log('');

    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, 'migrations', 'add-performance-indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 マイグレーションファイルを読み込みました');
    console.log('');

    // SQL を実行（複数のステートメントに分割）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('DO $$'));

    console.log(`🔧 ${statements.length} 個のインデックスを作成します...`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (!statement) continue;

      // インデックス名を抽出
      const match = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
      const indexName = match ? match[1] : 'unknown';

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

        if (error) {
          // rpc が使えない場合は、Postgres REST API を使用
          console.log(`  ⚙️  ${indexName} を作成中...`);

          // 直接 SQL を実行する代わりに、既存のテーブルに対してクエリを実行
          // ただし、インデックス作成は Supabase の制限により難しいため、
          // 別の方法を検討する必要があります

          console.log(`  ⚠️  ${indexName}: RPC経由での実行をスキップ`);
          skipCount++;
        } else {
          console.log(`  ✅ ${indexName} を作成しました`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ ${indexName} の作成に失敗: ${err.message}`);
        errorCount++;
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 マイグレーション結果:');
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ⚠️  スキップ: ${skipCount}`);
    console.log(`  ❌ 失敗: ${errorCount}`);
    console.log('═══════════════════════════════════════');
    console.log('');

    if (skipCount > 0) {
      console.log('⚠️  注意: Supabase の制限により、一部のインデックスを自動作成できませんでした');
      console.log('');
      console.log('📝 手動での実行方法:');
      console.log('  1. Supabase ダッシュボードにアクセス');
      console.log('  2. SQL Editor を開く');
      console.log('  3. migrations/add-performance-indexes.sql の内容を貼り付けて実行');
      console.log('');
      console.log('または、以下のコマンドで実行:');
      console.log('  npx supabase db execute --file migrations/add-performance-indexes.sql');
    }

  } catch (error) {
    console.error('❌ マイグレーション実行エラー:', error);
    process.exit(1);
  }
}

runMigration();
