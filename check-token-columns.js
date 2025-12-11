require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkTokenColumns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in .env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔍 usersテーブルのカラムを確認中...\n');

    // ユーザーを1件取得してカラムの存在を確認
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    console.log('📋 usersテーブルのカラム一覧:');
    console.log(Object.keys(data).join(', '));
    console.log('\n');

    // トークン関連のカラムをチェック
    const tokenColumns = ['total_tokens_used', 'token_limit', 'tokens_reset_at'];
    const missingColumns = tokenColumns.filter(col => !(col in data));

    if (missingColumns.length === 0) {
      console.log('✅ すべてのトークン関連カラムが存在します！');
      console.log(`   - total_tokens_used: ${data.total_tokens_used}`);
      console.log(`   - token_limit: ${data.token_limit}`);
      console.log(`   - tokens_reset_at: ${data.tokens_reset_at}`);
    } else {
      console.log('❌ 以下のカラムが存在しません:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n⚠️  マイグレーションを実行する必要があります！');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkTokenColumns().catch(console.error);
