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

console.log(`✅ Supabase URL: ${supabaseUrl}`);
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📊 パフォーマンス最適化マイグレーションを開始します...');
    console.log('');

    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251211000001_add_performance_indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 マイグレーションファイルを読み込みました');
    console.log('');

    // SQL を実行（複数のステートメントに分割）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // DO $$ ... END $$ ブロックを除外
    const filteredStatements = [];
    let skipNext = false;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.includes('DO $$')) {
        skipNext = true;
        continue;
      }
      if (skipNext && stmt.includes('END $$')) {
        skipNext = false;
        continue;
      }
      if (!skipNext && stmt.trim().startsWith('CREATE INDEX')) {
        filteredStatements.push(stmt);
      }
    }

    console.log(`🔧 ${filteredStatements.length} 個のインデックスを作成します...`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // PostgreSQL クライアントを使用（もし利用可能なら）
    for (const statement of filteredStatements) {
      const match = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
      const indexName = match ? match[1] : 'unknown';

      try {
        console.log(`  ⚙️  ${indexName} を作成中...`);

        // Supabaseの公開APIではCREATE INDEXは実行できないため、
        // 代わりにSupabaseダッシュボードでの実行を案内
        console.log(`  ℹ️  ${indexName}: Supabase APIの制限によりスキップ`);
        skipCount++;
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

    console.log('⚠️  重要: Supabase の JavaScript クライアントではインデックス作成ができません');
    console.log('');
    console.log('📝 以下の方法で手動実行してください:');
    console.log('');
    console.log('【方法1: Supabaseダッシュボード（推奨）】');
    console.log('  1. https://supabase.com/dashboard/project/vlytixemvzmtoabvtnod を開く');
    console.log('  2. SQL Editor に移動');
    console.log('  3. supabase/migrations/20251211000001_add_performance_indexes.sql の内容を貼り付け');
    console.log('  4. Run をクリック');
    console.log('');
    console.log('【方法2: PostgreSQLクライアント】');
    console.log('  brew install postgresql');
    console.log('  その後、以下のコマンドを実行:');
    console.log('  PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "postgresql://postgres.vlytixemvzmtoabvtnod:$SUPABASE_DB_PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20251211000001_add_performance_indexes.sql');
    console.log('');
    console.log('📄 マイグレーションファイル: supabase/migrations/20251211000001_add_performance_indexes.sql');

  } catch (error) {
    console.error('❌ マイグレーション実行エラー:', error);
    process.exit(1);
  }
}

runMigration();
