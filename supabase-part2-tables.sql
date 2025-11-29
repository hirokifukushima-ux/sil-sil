-- Part 2: 新しいテーブルの作成

-- Organizations テーブル
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  master_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations テーブル
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  inviter_type TEXT NOT NULL CHECK (inviter_type IN ('master', 'parent')),
  inviter_id UUID,
  target_type TEXT NOT NULL CHECK (target_type IN ('parent', 'child')),
  parent_id UUID,
  organization_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Articles テーブル
CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  parent_id UUID,
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

CREATE INDEX IF NOT EXISTS idx_articles_parent_id ON articles(parent_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- Article_Reactions テーブル
CREATE TABLE IF NOT EXISTS article_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id BIGINT,
  user_id UUID,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reactions_article_id ON article_reactions(article_id);

-- Questions テーブル
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id BIGINT,
  user_id UUID,
  question TEXT NOT NULL,
  parent_answer TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_questions_article_id ON questions(article_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);

-- Row Level Security (RLS) の有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Enable all for anon users" ON organizations;
DROP POLICY IF EXISTS "Enable all for anon users" ON invitations;
DROP POLICY IF EXISTS "Enable all for anon users" ON articles;
DROP POLICY IF EXISTS "Enable all for anon users" ON article_reactions;
DROP POLICY IF EXISTS "Enable all for anon users" ON questions;

CREATE POLICY "Enable all for anon users" ON organizations FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON invitations FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON articles FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON article_reactions FOR ALL USING (true);
CREATE POLICY "Enable all for anon users" ON questions FOR ALL USING (true);
