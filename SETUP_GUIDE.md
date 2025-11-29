# Supabase完全セットアップガイド

## 前提条件
- SupabaseプロジェクトURL: https://vlytixemvzmtoabvtnod.supabase.co
- NEXT_PUBLIC_USE_DATABASE=true が設定されていること

## ステップ1: データベースの状態確認

SupabaseのSQL Editorで `check-database.sql` を実行してください:
- invitationsテーブルの確認
- usersテーブルの確認
- articlesテーブルのparent_idカラム確認

## ステップ2: 必要なSQL実行

以下のSQLを **順番に** 実行してください:

### 2-1. スキーマキャッシュのリフレッシュ
```sql
NOTIFY pgrst, 'reload schema';
```

### 2-2. user_typeのCHECK制約を更新
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('master', 'parent', 'child'));
```

### 2-3. マスターユーザーの作成
```sql
INSERT INTO users (
  id,
  email,
  display_name,
  user_type,
  is_active,
  created_at,
  last_login_at
) VALUES (
  gen_random_uuid(),
  'master@know-news.com',
  'マスター管理者',
  'master',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING
RETURNING id, email, display_name;
```
→ マスターユーザーのUUIDをメモしてください

### 2-4. articlesテーブルにparent_idを追加
```sql
ALTER TABLE articles ADD COLUMN IF NOT EXISTS parent_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'articles' AND indexname = 'idx_articles_parent_id'
    ) THEN
        CREATE INDEX idx_articles_parent_id ON articles(parent_id);
    END IF;
END
$$;
```

### 2-5. 再度スキーマキャッシュをリフレッシュ
```sql
NOTIFY pgrst, 'reload schema';
```

## ステップ3: アプリケーションのテスト

### 3-1. ブラウザのlocalStorageをクリア
1. http://localhost:3000/login を開く
2. F12で開発者ツールを開く
3. Applicationタブ → Local Storage → http://localhost:3000 を選択
4. 右クリック → Clear
5. ページをリロード

### 3-2. マスターログイン
1. ページ下部の🔧をクリック
2. マスター管理者を選択
3. パスワード: `master999`
4. ログイン

### 3-3. 親アカウント招待を作成
1. マスターダッシュボードで「親アカウント」タブを選択
2. 「新規親アカウント招待」をクリック
3. メールアドレス: `test1@example.com`
4. 表示名: `テスト親1`
5. 「招待送信」をクリック
6. 招待コードをメモ（例: ABC12DEF）

### 3-4. 親アカウントを作成
1. ログアウト
2. ログインページで「招待コードを使う」をクリック
3. メモした招待コードを入力
4. 「招待を受ける」をクリック
5. 親ダッシュボードに自動ログイン

### 3-5. 子アカウントを作成
1. 親ダッシュボードで「子アカウント」タブを選択
2. 「新しい子アカウント」をクリック
3. 名前: `テスト子1`
4. 年齢: `8歳`
5. 「アカウント作成」をクリック
6. アクティベーションコードが表示される

## ステップ4: エラー確認

エラーが発生した場合:
1. ターミナルでサーバーログを確認
2. SupabaseのSQL Editorで以下を実行:
```sql
-- 最新の招待コードを確認
SELECT * FROM invitations ORDER BY created_at DESC LIMIT 5;

-- 最新のユーザーを確認
SELECT id, email, user_type, display_name FROM users ORDER BY created_at DESC LIMIT 5;
```

## トラブルシューティング

### 「招待コードが見つかりません」エラー
- invitationsテーブルに該当コードが存在するか確認
- スキーマキャッシュをリフレッシュ
- 新しい招待コードを作成

### 「UUID型エラー」
- localStorageをクリア
- 再ログイン
- マスターユーザーのUUIDが正しく取得されているか確認

### 「parent_id does not exist」エラー
- ステップ2-4を再実行
- スキーマキャッシュをリフレッシュ
