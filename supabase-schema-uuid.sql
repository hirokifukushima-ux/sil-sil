-- Know-News Supabase Schema (UUID版)
-- 既存のusersテーブルに合わせてUUIDを使用

-- 1. Users テーブル（既存のテーブルを使用 - 不足カラムを追加）
-- まず既存テーブルの構造を確認してから必要なカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS child_age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID;

-- user_typeカラムが存在しない場合は追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT;

-- 2. Organizations テーブル
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  master_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Invitations テーブル
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  inviter_type TEXT NOT NULL CHECK (inviter_type IN ('master', 'parent')),
  inviter_id UUID REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('parent', 'child')),
  parent_id UUID REFERENCES users(id),
  organization_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Articles テーブル（子供向け変換記事）
CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  parent_id UUID REFERENCES users(id),
  original_url TEXT NOT NULL,
  child_age INTEGER NOT NULL,
  original_title TEXT NOT NULL,
  converted_title TEXT NOT NULL,
  original_content TEXT NOT NULL,
  converted_content TEXT NOT NULL,
  converted_summary TEXT,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  site_name TEXT,
  image TEXT,
  has_read BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '[]',
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Article_Reactions テーブル（記事へのリアクション）
CREATE TABLE IF NOT EXISTS article_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Questions テーブル（子供からの質問）
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  question TEXT NOT NULL,
  parent_answer TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_users_master_id ON users(master_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_articles_parent_id ON articles(parent_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_article_id ON article_reactions(article_id);
CREATE INDEX IF NOT EXISTS idx_questions_article_id ON questions(article_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);

-- Row Level Security (RLS) の有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（全てのユーザーが読み書きできるように設定 - 認証はアプリケーション層で実施）
-- 本番環境では、より厳格なポリシーに変更することを推奨

CREATE POLICY IF NOT EXISTS "Enable all for anon users" ON organizations FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for anon users" ON invitations FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for anon users" ON articles FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for anon users" ON article_reactions FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for anon users" ON questions FOR ALL USING (true);
