const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 環境変数から設定を読み込む
require('dotenv').config({ path: '.env.local' });

const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.error('❌ SUPABASE_DB_PASSWORD が .env.local に設定されていません');
  process.exit(1);
}

const connectionString = `postgresql://postgres.vlytixemvzmtoabvtnod:${dbPassword}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📊 パフォーマンス最適化マイグレーションを開始します...');
    console.log('');

    console.log('🔌 データベースに接続中...');
    await client.connect();
    console.log('✅ 接続成功');
    console.log('');

    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251211000001_add_performance_indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 マイグレーションファイルを読み込みました');
    console.log('');

    // SQL 全体を実行
    console.log('🔧 インデックスを作成中...');
    console.log('');

    await client.query(sql);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✅ マイグレーション成功！');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📊 追加されたインデックス:');
    console.log('  • idx_articles_parent_id - 親IDでのフィルタリング高速化');
    console.log('  • idx_articles_created_at - 作成日時でのソート高速化');
    console.log('  • idx_articles_is_archived - アーカイブ状態でのフィルタリング高速化');
    console.log('  • idx_articles_parent_archived_created - 複合インデックス（最適化）');
    console.log('  • idx_articles_category - カテゴリでのフィルタリング高速化');
    console.log('  • idx_articles_has_read - 既読状態でのフィルタリング高速化');
    console.log('  • idx_users_user_type - ユーザー種別でのフィルタリング高速化');
    console.log('  • idx_users_parent_id - 親IDでのフィルタリング高速化');
    console.log('  • idx_users_master_id - マスターIDでのフィルタリング高速化');
    console.log('  • idx_users_organization_id - 組織IDでのフィルタリング高速化');
    console.log('  • idx_users_is_active - アクティブ状態でのフィルタリング高速化');
    console.log('  • idx_reactions_article_id - 記事IDでのリアクション取得高速化');
    console.log('  • idx_reactions_user_id - ユーザーIDでのリアクション取得高速化');
    console.log('  • idx_questions_article_id - 記事IDでの質問取得高速化');
    console.log('  • idx_questions_user_id - ユーザーIDでの質問取得高速化');
    console.log('  • idx_questions_status - ステータスでのフィルタリング高速化');
    console.log('  • idx_invitations_inviter_id - 招待者IDでのフィルタリング高速化');
    console.log('  • idx_invitations_status - ステータスでのフィルタリング高速化');
    console.log('  • idx_invitations_expires_at - 有効期限でのフィルタリング高速化');
    console.log('  • idx_organizations_master_id - マスターIDでのフィルタリング高速化');
    console.log('  • idx_organizations_is_active - アクティブ状態でのフィルタリング高速化');
    console.log('');
    console.log('🚀 期待される効果:');
    console.log('  - 記事取得速度: 1000ms → 100-200ms（約5-10倍高速化）');
    console.log('  - 統計取得速度: 大幅な改善');
    console.log('  - ユーザー一覧取得: 高速化');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════');
    console.error('❌ マイグレーション失敗');
    console.error('═══════════════════════════════════════');
    console.error('');
    console.error('エラー詳細:', error.message);
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    console.error('');
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 データベース接続を切断しました');
  }
}

runMigration();
