require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in .env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 マイグレーション開始...');

    // SQLを直接実行（SupabaseのRPC経由）
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/add-token-limits.sql'),
      'utf8'
    );

    // 各SQLステートメントを個別に実行
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.warn('⚠️  ステートメント実行エラー（スキップ）:', error.message);
        // カラムが既に存在する場合のエラーは無視
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    console.log('✅ マイグレーション完了！');
    console.log('📊 追加されたカラム:');
    console.log('  - total_tokens_used (累計トークン使用量)');
    console.log('  - token_limit (月間上限: デフォルト50,000トークン)');
    console.log('  - tokens_reset_at (次回リセット日時)');

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);

    console.log('\n📝 手動でマイグレーションを実行してください:');
    console.log('1. Supabaseダッシュボードにアクセス: https://supabase.com');
    console.log('2. SQL Editorを開く');
    console.log('3. 以下のSQLを実行:');
    console.log('\nALTER TABLE users');
    console.log('ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0,');
    console.log('ADD COLUMN IF NOT EXISTS token_limit INTEGER DEFAULT 50000,');
    console.log('ADD COLUMN IF NOT EXISTS tokens_reset_at TIMESTAMPTZ DEFAULT NOW();');
  }
}

runMigration().catch(console.error);
