-- 1. invitationsテーブルの全データを確認
SELECT * FROM invitations ORDER BY created_at DESC LIMIT 10;

-- 2. 特定の招待コードを検索
SELECT * FROM invitations WHERE code = 'RHT4LZ1U';

-- 3. usersテーブルの最新データを確認
SELECT id, email, user_type, display_name, created_at FROM users ORDER BY created_at DESC LIMIT 10;

-- 4. articlesテーブルにparent_idカラムが存在するか確認
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'articles' AND column_name = 'parent_id';

-- 5. すべてのテーブルを確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
