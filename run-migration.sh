#!/bin/bash

# 招待コード再ログイン問題 - マイグレーション実行スクリプト
# 実行方法: chmod +x run-migration.sh && ./run-migration.sh

set -e

echo "=========================================="
echo "招待コード再ログイン問題 - マイグレーション"
echo "=========================================="
echo ""

echo "このスクリプトは以下の手順を実行します:"
echo "1. SupabaseでSQLを実行する手順を表示"
echo "2. マイグレーション後の確認"
echo "3. W6V1SHEEでのログインテスト"
echo ""

# Step 1: SQL実行の案内
echo "=== ステップ1: Supabase SQL Editor でSQLを実行 ==="
echo ""
echo "以下のURLにアクセスしてください:"
echo "https://supabase.com/dashboard/project/vlytixemvzmtoabvtnod/sql/new"
echo ""
echo "次のSQLをコピー&ペーストして実行してください:"
echo ""
cat << 'EOF'
-- 1. カラムを追加
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS accepted_user_id UUID REFERENCES users(id);

-- 2. 既存データを更新
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

-- 3. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_user_id
ON invitations(accepted_user_id);

-- 4. 確認
SELECT code, email, target_type, status, accepted_user_id
FROM invitations
WHERE status = 'accepted'
ORDER BY created_at DESC;
EOF
echo ""
echo "SQLを実行したら、Enterキーを押して続行してください..."
read -r

# Step 2: マイグレーション確認
echo ""
echo "=== ステップ2: マイグレーション確認 ==="
echo ""
echo "マイグレーション状態を確認中..."
MIGRATION_STATUS=$(curl -s http://localhost:3000/api/admin/migrate)
echo "$MIGRATION_STATUS" | jq '.'

if echo "$MIGRATION_STATUS" | jq -e '.needsMigration == false' > /dev/null 2>&1; then
  echo "✅ マイグレーション成功！"
else
  echo "⚠️  マイグレーションが必要です。SQLが正しく実行されたか確認してください。"
  echo ""
  echo "詳細: MIGRATION_GUIDE.md を参照してください"
  exit 1
fi

# Step 3: ログインテスト
echo ""
echo "=== ステップ3: W6V1SHEE ログインテスト ==="
echo ""
echo "1回目のログイン..."
LOGIN1=$(curl -s -X POST http://localhost:3000/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d '{"code":"W6V1SHEE"}')

USER_ID1=$(echo "$LOGIN1" | jq -r '.user.id')
echo "ユーザーID: $USER_ID1"

sleep 1

echo ""
echo "2回目のログイン（同じユーザーIDが返されるべき）..."
LOGIN2=$(curl -s -X POST http://localhost:3000/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d '{"code":"W6V1SHEE"}')

USER_ID2=$(echo "$LOGIN2" | jq -r '.user.id')
echo "ユーザーID: $USER_ID2"

if [ "$USER_ID1" = "$USER_ID2" ]; then
  echo ""
  echo "✅ テスト成功！ 同じユーザーIDが返されました"
else
  echo ""
  echo "❌ テスト失敗！ 異なるユーザーIDが返されました"
  echo "1回目: $USER_ID1"
  echo "2回目: $USER_ID2"
  exit 1
fi

# Step 4: データ確認
echo ""
echo "=== ステップ4: 記事と子アカウントの確認 ==="
echo ""
echo "記事を確認中..."
ARTICLES=$(curl -s "http://localhost:3000/api/articles/recent?limit=10" \
  -H "X-Auth-Session: {\"userId\":\"$USER_ID1\",\"userType\":\"parent\"}")

ARTICLE_COUNT=$(echo "$ARTICLES" | jq '. | length')
echo "記事数: $ARTICLE_COUNT"

echo ""
echo "子アカウントを確認中..."
CHILDREN=$(curl -s "http://localhost:3000/api/parent/children" \
  -H "X-Auth-Session: {\"userId\":\"$USER_ID1\",\"userType\":\"parent\"}")

CHILDREN_COUNT=$(echo "$CHILDREN" | jq '. | length')
echo "子アカウント数: $CHILDREN_COUNT"

# 完了
echo ""
echo "=========================================="
echo "✅ 全てのテストが完了しました！"
echo "=========================================="
echo ""
echo "修正内容:"
echo "- 招待コード再ログインで常に同じユーザーが返される"
echo "- 記事と子アカウントが正しく表示される"
echo ""
echo "詳細はMIGRATION_GUIDE.mdを参照してください"
