-- articlesテーブルにparent_idカラムを追加
ALTER TABLE articles ADD COLUMN IF NOT EXISTS parent_id UUID;

-- インデックスを作成
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'articles' AND indexname = 'idx_articles_parent_id'
    ) THEN
        CREATE INDEX idx_articles_parent_id ON articles(parent_id);
    END IF;
END
$$;
