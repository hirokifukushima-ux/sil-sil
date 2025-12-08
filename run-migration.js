// マイグレーション実行スクリプト
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://vlytixemvzmtoabvtnod.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseXRpeGVtdnptdG9hYnZ0bm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjI2MzAsImV4cCI6MjA3MjczODYzMH0.9mY_rjpluLzfaz-1WcrNyk3H9hrnyZpAiBTk9V-E83g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 マイグレーションを実行中...');
  console.log('📝 Task: Add type column to invitations table\n');

  try {
    // 1. type カラムを追加
    console.log('1. type カラムを追加中...');

    // Supabase doesn't support ALTER TABLE via RPC, so we use direct table operations
    // First, check if column exists by trying to select it
    const { error: checkError } = await supabase
      .from('invitations')
      .select('type')
      .limit(1);

    if (checkError && checkError.message.includes('column "type" does not exist')) {
      console.log('⚠️  type カラムが存在しません。Supabase Dashboardで手動追加が必要です。');
      console.log('\n📋 実行するSQL:');
      console.log('ALTER TABLE invitations ADD COLUMN type TEXT DEFAULT \'private\' CHECK (type IN (\'public\', \'private\'));');
      console.log('\n');
    } else if (!checkError) {
      console.log('✅ type カラムは既に存在します');
    } else {
      console.error('❌ カラム確認エラー:', checkError);
    }

    // 2. 'teleport' コードを type='public' に更新
    console.log('\n2. \'teleport\' コードを type=\'public\' に更新中...');

    const { data: teleportBefore, error: beforeError } = await supabase
      .from('invitations')
      .select('code, type, status')
      .eq('code', 'teleport')
      .single();

    if (beforeError) {
      console.error('❌ teleport 確認エラー:', beforeError.message);
    } else {
      console.log('📋 更新前:', teleportBefore);
    }

    const { error: updateError } = await supabase
      .from('invitations')
      .update({ type: 'public' })
      .eq('code', 'teleport');

    if (updateError) {
      console.error('❌ teleport 更新エラー:', updateError.message);
      if (updateError.message.includes('column "type" does not exist')) {
        console.log('⚠️  先にSupabase DashboardでSQL Editorから以下を実行してください:');
        console.log('   ALTER TABLE invitations ADD COLUMN type TEXT DEFAULT \'private\';');
      }
    } else {
      console.log('✅ teleport 更新完了');

      const { data: teleportAfter } = await supabase
        .from('invitations')
        .select('code, type, status')
        .eq('code', 'teleport')
        .single();

      if (teleportAfter) {
        console.log('📋 更新後:', teleportAfter);
      }
    }

    // 3. 全ての招待コードを確認
    console.log('\n3. 全招待コードの確認...');
    const { data: allInvitations, error: selectError } = await supabase
      .from('invitations')
      .select('code, type, status')
      .order('created_at', { ascending: false })
      .limit(10);

    if (selectError) {
      console.error('❌ 確認クエリエラー:', selectError.message);
    } else {
      console.log('\n✅ マイグレーション完了！\n');
      console.log('招待コード一覧（最新10件）:');
      console.table(allInvitations);
    }

  } catch (error) {
    console.error('マイグレーション実行エラー:', error);
    process.exit(1);
  }
}

runMigration();
