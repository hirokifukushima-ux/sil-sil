-- シルシル (知る知る) データベーススキーマ
-- Supabase用テーブル定義

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('child', 'parent')),
    display_name VARCHAR(100),
    child_age INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 記事テーブル
CREATE TABLE IF NOT EXISTS articles (
    id BIGSERIAL PRIMARY KEY,
    original_url TEXT NOT NULL,
    child_age INTEGER NOT NULL,
    original_title TEXT NOT NULL,
    converted_title TEXT NOT NULL,
    original_content TEXT NOT NULL,
    converted_content TEXT NOT NULL,
    converted_summary TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    site_name VARCHAR(100),
    image TEXT,
    has_read BOOLEAN NOT NULL DEFAULT false,
    reactions TEXT[] DEFAULT '{}',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- リアクションテーブル
CREATE TABLE IF NOT EXISTS article_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(article_id, user_id, reaction)
);

-- 質問テーブル
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    parent_answer TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_child_age ON articles(child_age);
CREATE INDEX IF NOT EXISTS idx_articles_archived ON articles(is_archived);
CREATE INDEX IF NOT EXISTS idx_article_reactions_article_id ON article_reactions(article_id);
CREATE INDEX IF NOT EXISTS idx_questions_article_id ON questions(article_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);

-- Row Level Security (RLS) ポリシー
-- 今回はシンプルなアプリなので基本的なポリシーのみ設定

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- すべてのテーブルに対する基本的な読み書きポリシー
-- 実際のアプリケーションではより厳密な認証ベースのポリシーが推奨
CREATE POLICY "Enable read access for all users" ON articles FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON articles FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON articles FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON users FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON article_reactions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON article_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON article_reactions FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON questions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON questions FOR UPDATE USING (true);

-- サンプルデータの挿入（テスト用）
INSERT INTO articles (
    original_url,
    child_age,
    original_title,
    converted_title,
    original_content,
    converted_content,
    converted_summary,
    category,
    status,
    has_read,
    reactions
) VALUES 
(
    'https://example.com/space-mission',
    8,
    'Mars Rover Successfully Lands on Red Planet',
    'うちゅうせんが あかいほしに たどりついたよ！',
    'NASA''s latest Mars rover has successfully landed on the Martian surface...',
    'NASAの あたらしい うちゅうせんが かせいに たどりつきました。このうちゅうせんは...',
    'うちゅうせんが かせいで あたらしい はっけんを するかもしれません',
    'かがく',
    'active',
    false,
    '{}'
),
(
    'https://example.com/dinosaur-discovery',
    8,
    'New Dinosaur Species Discovered in Argentina',
    'あたらしい きょうりゅうが みつかったよ！',
    'Paleontologists have uncovered a new species of dinosaur in Argentina...',
    'がくしゃが アルゼンチンで あたらしい きょうりゅうの ほねを みつけました...',
    'とても おおきな きょうりゅうで あたらしい しゅるいでした',
    'かがく',
    'active',
    true,
    '{"good"}'
);