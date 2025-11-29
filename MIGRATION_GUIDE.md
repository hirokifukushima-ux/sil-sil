# 招待コード再ログイン問題 - マイグレーションガイド

## 問題の概要

招待コードW6V1SHEEで再ログインするたびに異なるユーザーIDが返され、以前作成した記事や子アカウントが表示されない問題が発生していました。

## 根本原因

`/src/app/api/auth/invitation-login/route.ts`のロジックが、同じマスターによって作成された全ての親アカウントにマッチし、**最新**のアカウントを返していたため、ログインのたびに異なるユーザーが返されていました。

## 修正内容

### 1. データベーススキーマ変更

invitationsテーブルに`accepted_user_id`カラムを追加し、招待コードを最初に受け入れたユーザーのIDを永続的に記録するようにしました。

### 2. コード修正

- ✅ `src/lib/database/types.ts` - Invitation型にacceptedUserIdフィールドを追加
- ✅ `src/lib/database/supabase.ts` - transform関数とacceptInvitation関数を更新
- ✅ `src/app/api/auth/invitation-login/route.ts` - 再ログイン時にacceptedUserIdを使用する新しいロジックに変更

## マイグレーション手順

### ステップ1: SQLをSupabaseで実行

1. Supabaseダッシュボードにアクセス: https://supabase.com/dashboard
2. プロジェクト「vlytixemvzmtoabvtnod」を選択
3. 左メニューから「SQL Editor」を選択
4. 「New query」をクリック
5. 以下のSQLをコピー&ペーストして実行:

\`\`\`sql
-- 1. カラムを追加
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS accepted_user_id UUID REFERENCES users(id);

-- 2. 既存の accepted 状態の招待コードに対して、正しい accepted_user_id を設定
-- （最初に作成されたユーザーを設定）
UPDATE invitations i
SET accepted_user_id = (
  SELECT u.id
  FROM users u
  WHERE u.created_by = i.inviter_id
    AND u.user_type = i.target_type
    AND (u.email = i.email OR u.email IS NULL OR i.email IS NULL)
  ORDER BY u.created_at ASC
  LIMIT 1
)
WHERE i.status = 'accepted'
  AND i.accepted_user_id IS NULL;

-- 3. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_user_id
ON invitations(accepted_user_id);
\`\`\`

6. 「Run」ボタンをクリック

### ステップ2: 結果確認

以下のコマンドで確認:

\`\`\`bash
curl -s http://localhost:3000/api/admin/migrate | jq
\`\`\`

または、ブラウザで http://localhost:3000/api/admin/migrate にアクセス

期待される結果:
- `needsMigration: false`
- 全ての accepted 状態の招待に `accepted_user_id` が設定されている

### ステップ3: 動作テスト

1. 招待コード W6V1SHEE でログイン:

\`\`\`bash
curl -X POST http://localhost:3000/api/auth/invitation-login \\
  -H "Content-Type: application/json" \\
  -d '{"code":"W6V1SHEE"}'
\`\`\`

2. 返されるユーザーIDを確認（毎回同じIDが返されるはず）

3. 記事と子アカウントが正しく表示されることを確認:

\`\`\`bash
# 記事を確認
curl -s "http://localhost:3000/api/articles/recent?limit=10" \\
  -H "X-Auth-Session: {\"userId\":\"<USER_ID>\",\"userType\":\"parent\"}"

# 子アカウントを確認
curl -s "http://localhost:3000/api/parent/children" \\
  -H "X-Auth-Session: {\"userId\":\"<USER_ID>\",\"userType\":\"parent\"}"
\`\`\`

## 変更されたファイル一覧

- `fix-invitation-login.sql` - マイグレーションSQL（新規作成）
- `src/lib/database/types.ts` - 型定義更新
- `src/lib/database/supabase.ts` - データベース層の更新
- `src/app/api/auth/invitation-login/route.ts` - ログインロジックの修正
- `src/app/api/admin/migrate/route.ts` - マイグレーション確認用API（新規作成）

## トラブルシューティング

### 問題: SQLエラーが発生する

- カラムが既に存在する場合は無視されます（IF NOT EXISTS）
- 権限エラーの場合は、Supabaseのサービスロールを使用していることを確認

### 問題: 依然として異なるユーザーIDが返される

1. マイグレーションSQLが正常に実行されたか確認
2. `accepted_user_id` カラムにデータが入っているか確認:

\`\`\`sql
SELECT code, status, accepted_user_id
FROM invitations
WHERE code = 'W6V1SHEE';
\`\`\`

3. アプリケーションを再起動

## 完了確認

✅ SQLマイグレーションが成功
✅ W6V1SHEEログインで毎回同じユーザーID
✅ 記事が表示される
✅ 子アカウントが表示される

---

*マイグレーション作成日: 2025-11-29*
