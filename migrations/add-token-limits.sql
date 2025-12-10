-- トークン使用量と制限カラムを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_limit INTEGER DEFAULT 50000,  -- 月間50,000トークン（約$0.08 = 約12円）
ADD COLUMN IF NOT EXISTS tokens_reset_at TIMESTAMPTZ DEFAULT NOW();

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_users_token_limit ON users(total_tokens_used, token_limit);

-- コメントを追加
COMMENT ON COLUMN users.total_tokens_used IS '累計トークン使用量（月ごとにリセット）';
COMMENT ON COLUMN users.token_limit IS '月間トークン使用上限';
COMMENT ON COLUMN users.tokens_reset_at IS '次回トークンリセット日時';
