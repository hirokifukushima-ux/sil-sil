// マイグレーション実行スクリプト
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://vlytixemvzmtoabvtnod.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseXRpeGVtdnptdG9hYnZ0bm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjI2MzAsImV4cCI6MjA3MjczODYzMH0.9mY_rjpluLzfaz-1WcrNyk3H9hrnyZpAiBTk9V-E83g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('マイグレーションを実行中...');

  try {
    // 1. カラムを追加
    console.log('1. accepted_user_id カラムを追加中...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE invitations ADD COLUMN IF NOT EXISTS accepted_user_id TEXT REFERENCES users(id);'
    });

    if (alterError && !alterError.message.includes('already exists')) {
      console.error('カラム追加エラー:', alterError);
      // 続行する
    } else {
      console.log('✓ カラム追加完了');
    }

    // 2. 既存データを更新
    console.log('2. 既存の accepted 状態の招待コードを更新中...');
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE invitations i
        SET accepted_user_id = (
          SELECT u.id
          FROM users u
          WHERE u.created_by = i.inviter_id
            AND u.user_type = i.target_type
            AND (u.email = i.email OR u.email IS NULL OR i.email IS NULL)
          ORDER BY u.created_at ASC
          LIMIT 1
        )
        WHERE i.status = 'accepted'
          AND i.accepted_user_id IS NULL;
      `
    });

    if (updateError && !updateError.message.includes('does not exist')) {
      console.error('データ更新エラー:', updateError);
      // 続行する
    } else {
      console.log('✓ 既存データ更新完了');
    }

    // 3. インデックスを追加
    console.log('3. インデックスを追加中...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_invitations_accepted_user_id ON invitations(accepted_user_id);'
    });

    if (indexError && !indexError.message.includes('already exists')) {
      console.error('インデックス追加エラー:', indexError);
      // 続行する
    } else {
      console.log('✓ インデックス追加完了');
    }

    // 4. 確認クエリ
    console.log('\n4. 結果を確認中...');
    const { data, error: selectError } = await supabase
      .from('invitations')
      .select('code, email, target_type, status, accepted_user_id')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (selectError) {
      console.error('確認クエリエラー:', selectError);
    } else {
      console.log('\n✓ マイグレーション完了！\n');
      console.log('受け入れ済み招待コード一覧:');
      console.table(data);
    }

  } catch (error) {
    console.error('マイグレーション実行エラー:', error);
    process.exit(1);
  }
}

runMigration();
