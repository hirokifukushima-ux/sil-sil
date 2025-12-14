-- 記事テーブルに子どもIDカラムを追加
-- 個別管理を可能にするための変更

-- 1. child_id カラムを追加
ALTER TABLE articles
ADD COLUMN child_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. child_id にインデックスを追加
CREATE INDEX IF NOT EXISTS idx_articles_child_id
ON articles(child_id);

-- 3. child_id と parent_id の複合インデックス
CREATE INDEX IF NOT EXISTS idx_articles_parent_child
ON articles(parent_id, child_id);

-- 注意事項:
-- - child_age は引き続き保持（参考情報として有用）
-- - 既存の記事は child_id が NULL のまま（parent_id と child_age でフィルタリング）
-- - 今後作成される記事は child_id を必須で設定する
