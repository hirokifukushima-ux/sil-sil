-- パフォーマンス最適化のためのインデックス追加
-- 2025-12-11: リファクタリング - 記事取得の高速化

-- 記事テーブルのインデックス
-- parent_id でのフィルタリングを高速化（最も頻繁に使用される）
CREATE INDEX IF NOT EXISTS idx_articles_parent_id ON articles(parent_id);

-- created_at でのソートを高速化
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- is_archived でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_articles_is_archived ON articles(is_archived);

-- 複合インデックス: parent_id + is_archived + created_at
-- 記事一覧取得クエリを最適化（WHERE parent_id = ? AND is_archived = false ORDER BY created_at DESC）
CREATE INDEX IF NOT EXISTS idx_articles_parent_archived_created
ON articles(parent_id, is_archived, created_at DESC);

-- category でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

-- has_read でのフィルタリングを高速化（統計取得用）
CREATE INDEX IF NOT EXISTS idx_articles_has_read ON articles(has_read);

-- ユーザーテーブルのインデックス
-- user_type でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- parent_id でのフィルタリングを高速化（子アカウント取得用）
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);

-- master_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_users_master_id ON users(master_id);

-- organization_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- is_active でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 既存のトークン制限インデックス（念のため再作成）
CREATE INDEX IF NOT EXISTS idx_users_token_limit ON users(token_limit);

-- リアクションテーブルのインデックス
-- article_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_reactions_article_id ON article_reactions(article_id);

-- user_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON article_reactions(user_id);

-- 質問テーブルのインデックス
-- article_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_questions_article_id ON questions(article_id);

-- user_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);

-- status でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);

-- 招待テーブルのインデックス
-- inviter_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);

-- status でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- expires_at でのフィルタリングを高速化（期限切れチェック用）
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- 組織テーブルのインデックス
-- master_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_organizations_master_id ON organizations(master_id);

-- is_active でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- インデックス作成完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ パフォーマンス最適化インデックスの追加が完了しました';
  RAISE NOTICE '📊 期待される効果:';
  RAISE NOTICE '  - 記事取得速度: 1000ms → 100-200ms（約5-10倍高速化）';
  RAISE NOTICE '  - 統計取得速度: 大幅な改善';
  RAISE NOTICE '  - ユーザー一覧取得: 高速化';
END $$;
