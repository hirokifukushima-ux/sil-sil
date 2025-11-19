-- Know-News Supabase Schema
-- このファイルをSupabase SQL Editorで実行してテーブルを作成してください

-- 1. Users テーブル（マスター、親、子アカウント）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('master', 'parent', 'child')),
  display_name TEXT NOT NULL,
  child_age INTEGER,
  parent_id TEXT REFERENCES users(id),
  master_id TEXT REFERENCES users(id),
  organization_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- 2. Organizations テーブル
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  master_id TEXT REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Invitations テーブル
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  inviter_type TEXT NOT NULL CHECK (inviter_type IN ('master', 'parent')),
  inviter_id TEXT REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('parent', 'child')),
  parent_id TEXT REFERENCES users(id),
  organization_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Articles テーブル（子供向け変換記事）
CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  parent_id TEXT REFERENCES users(id),
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

-- 5. Reactions テーブル（記事へのリアクション）
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Questions テーブル（子供からの質問）
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
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
CREATE INDEX IF NOT EXISTS idx_reactions_article_id ON reactions(article_id);
CREATE INDEX IF NOT EXISTS idx_questions_article_id ON questions(article_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);

-- Row Level Security (RLS) の有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（全てのユーザーが読み書きできるように設定 - 認証はアプリケーション層で実施）
-- 本番環境では、より厳格なポリシーに変更することを推奨

CREATE POLICY "Enable all for anon users" ON users FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON organizations FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON invitations FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON articles FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON reactions FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON questions FOR ALL USING (true);
