#!/bin/bash

# Know-News 総合テストスイート
# 管理者による徹底的な動作確認

set -e  # エラーで停止

BASE_URL="http://localhost:3000"
MASTER_ID="f5d3ce64-0d64-44ca-a7d4-0a88b6e044fa"

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# テスト結果カウンター
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# テスト結果を記録
test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ ! -z "$3" ]; then
            echo -e "${RED}  Error: $3${NC}"
        fi
    fi
}

# セクションヘッダー
section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

echo -e "${YELLOW}"
cat << "EOF"
╔═══════════════════════════════════════════╗
║   Know-News 総合テストスイート            ║
║   管理者による徹底的な動作確認            ║
╚═══════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ============================================
# 単体テスト: 認証・ログイン機能
# ============================================
section "単体テスト 1: 認証・ログイン機能"

# Test 1-1: マスターログイン
echo "Test 1-1: マスターログイン"
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"master@know-news.com","password":"master999","userType":"master"}')
SUCCESS=$(echo $RESPONSE | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    test_result 0 "マスターログイン成功"
else
    test_result 1 "マスターログイン失敗" "$RESPONSE"
fi

# Test 1-2: 新規招待コードで親アカウント作成
echo "Test 1-2: 新規招待コードで親アカウント作成"
# まず新しい招待コードを作成
INV_RESPONSE=$(curl -s -X POST $BASE_URL/api/master/parents \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test-parent@example.com\",\"displayName\":\"Test Parent\",\"masterId\":\"$MASTER_ID\"}")
NEW_INV_CODE=$(echo $INV_RESPONSE | jq -r '.invitation.code')
echo "  作成された招待コード: $NEW_INV_CODE"

# 招待コードで新規アカウント作成
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$NEW_INV_CODE\",\"email\":\"test-parent@example.com\",\"displayName\":\"Test Parent\"}")
SUCCESS=$(echo $LOGIN_RESPONSE | jq -r '.success')
IS_NEW=$(echo $LOGIN_RESPONSE | jq -r '.isNewUser')
PARENT_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')
if [ "$SUCCESS" = "true" ] && [ "$IS_NEW" = "true" ]; then
    test_result 0 "新規親アカウント作成成功 (ID: $PARENT_ID)"
else
    test_result 1 "新規親アカウント作成失敗" "$LOGIN_RESPONSE"
fi

# Test 1-3: 同じ招待コードで再ログイン
echo "Test 1-3: 同じ招待コードで再ログイン"
RELOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$NEW_INV_CODE\"}")
SUCCESS=$(echo $RELOGIN_RESPONSE | jq -r '.success')
IS_NEW=$(echo $RELOGIN_RESPONSE | jq -r '.isNewUser')
RELOGIN_ID=$(echo $RELOGIN_RESPONSE | jq -r '.user.id')
if [ "$SUCCESS" = "true" ] && [ "$IS_NEW" = "false" ] && [ "$RELOGIN_ID" = "$PARENT_ID" ]; then
    test_result 0 "再ログイン成功 (同じユーザーID)"
else
    test_result 1 "再ログイン失敗" "Expected ID: $PARENT_ID, Got: $RELOGIN_ID"
fi

# Test 1-4: 無効な招待コードでログイン試行
echo "Test 1-4: 無効な招待コードでログイン試行"
INVALID_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d '{"code":"INVALID1"}')
ERROR=$(echo $INVALID_RESPONSE | jq -r '.error')
if [ ! -z "$ERROR" ] && [ "$ERROR" != "null" ]; then
    test_result 0 "無効な招待コードで適切にエラー"
else
    test_result 1 "無効な招待コードのエラーハンドリング失敗"
fi

# ============================================
# 単体テスト: アカウント管理
# ============================================
section "単体テスト 2: アカウント管理"

# Test 2-1: 子アカウント作成
echo "Test 2-1: 子アカウント作成"
CHILD_RESPONSE=$(curl -s -X POST $BASE_URL/api/parent/children \
  -H "Content-Type: application/json" \
  -H "X-Auth-Session: {\"userId\":\"$PARENT_ID\",\"userType\":\"parent\",\"masterId\":\"$MASTER_ID\"}" \
  -d '{"displayName":"Test Child","childAge":8}')
SUCCESS=$(echo $CHILD_RESPONSE | jq -r '.success')
CHILD_ID=$(echo $CHILD_RESPONSE | jq -r '.child.id')
ACTIVATION_CODE=$(echo $CHILD_RESPONSE | jq -r '.activationCode')
if [ "$SUCCESS" = "true" ] && [ ! -z "$CHILD_ID" ]; then
    test_result 0 "子アカウント作成成功 (ID: $CHILD_ID, Code: $ACTIVATION_CODE)"
else
    test_result 1 "子アカウント作成失敗" "$CHILD_RESPONSE"
fi

# Test 2-2: アクティベーションコードでログイン
echo "Test 2-2: アクティベーションコードでログイン"
ACT_LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/activation-login \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$ACTIVATION_CODE\"}")
SUCCESS=$(echo $ACT_LOGIN_RESPONSE | jq -r '.success')
ACT_CHILD_ID=$(echo $ACT_LOGIN_RESPONSE | jq -r '.user.id')
if [ "$SUCCESS" = "true" ] && [ "$ACT_CHILD_ID" = "$CHILD_ID" ]; then
    test_result 0 "アクティベーションコードログイン成功"
else
    test_result 1 "アクティベーションコードログイン失敗" "Expected: $CHILD_ID, Got: $ACT_CHILD_ID"
fi

# Test 2-3: 子アカウント一覧取得
echo "Test 2-3: 子アカウント一覧取得"
CHILDREN_RESPONSE=$(curl -s $BASE_URL/api/parent/children \
  -H "X-Auth-Session: {\"userId\":\"$PARENT_ID\",\"userType\":\"parent\"}")
SUCCESS=$(echo $CHILDREN_RESPONSE | jq -r '.success')
CHILDREN_COUNT=$(echo $CHILDREN_RESPONSE | jq -r '.children | length')
if [ "$SUCCESS" = "true" ] && [ $CHILDREN_COUNT -gt 0 ]; then
    test_result 0 "子アカウント一覧取得成功 ($CHILDREN_COUNT件)"
else
    test_result 1 "子アカウント一覧取得失敗"
fi

# ============================================
# 単体テスト: 記事変換・保存
# ============================================
section "単体テスト 3: 記事変換・保存"

# Test 3-1: 記事変換API
echo "Test 3-1: 記事変換API (Yahoo News)"
ARTICLE_RESPONSE=$(curl -s -X POST $BASE_URL/api/articles/share \
  -H "Content-Type: application/json" \
  -H "X-Auth-Session: {\"userId\":\"$PARENT_ID\",\"userType\":\"parent\"}" \
  -d '{"url":"https://news.yahoo.co.jp/articles/test-article","childAge":8}' \
  --max-time 30)
SUCCESS=$(echo $ARTICLE_RESPONSE | jq -r '.success')
ARTICLE_ID=$(echo $ARTICLE_RESPONSE | jq -r '.article.id')
ARTICLE_PARENT_ID=$(echo $ARTICLE_RESPONSE | jq -r '.article.parentId')
if [ "$SUCCESS" = "true" ] && [ ! -z "$ARTICLE_ID" ] && [ "$ARTICLE_PARENT_ID" = "$PARENT_ID" ]; then
    test_result 0 "記事変換成功 (ID: $ARTICLE_ID, parentId設定済み)"
else
    test_result 1 "記事変換失敗" "$ARTICLE_RESPONSE"
fi

# Test 3-2: 記事がデータベースに保存されているか確認
echo "Test 3-2: 記事保存の確認 (Supabase)"
sleep 1  # データベース同期待ち
DB_ARTICLE=$(curl -s "https://vlytixemvzmtoabvtnod.supabase.co/rest/v1/articles?select=id,parent_id&id=eq.$ARTICLE_ID" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseXRpeGVtdnptdG9hYnZ0bm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjI2MzAsImV4cCI6MjA3MjczODYzMH0.9mY_rjpluLzfaz-1WcrNyk3H9hrnyZpAiBTk9V-E83g" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseXRpeGVtdnptdG9hYnZ0bm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjI2MzAsImV4cCI6MjA3MjczODYzMH0.9mY_rjpluLzfaz-1WcrNyk3H9hrnyZpAiBTk9V-E83g")
DB_PARENT_ID=$(echo $DB_ARTICLE | jq -r '.[0].parent_id')
if [ "$DB_PARENT_ID" = "$PARENT_ID" ]; then
    test_result 0 "記事がデータベースに正しく保存されている"
else
    test_result 1 "記事のデータベース保存失敗" "Expected parentId: $PARENT_ID, Got: $DB_PARENT_ID"
fi

# ============================================
# 単体テスト: 記事取得
# ============================================
section "単体テスト 4: 記事取得"

# Test 4-1: 親アカウントで記事取得
echo "Test 4-1: 親アカウントで記事取得"
PARENT_ARTICLES=$(curl -s "$BASE_URL/api/articles/recent?parentId=$PARENT_ID&limit=10" \
  -H "X-Auth-Session: {\"userId\":\"$PARENT_ID\",\"userType\":\"parent\"}")
SUCCESS=$(echo $PARENT_ARTICLES | jq -r '.success')
ARTICLE_COUNT=$(echo $PARENT_ARTICLES | jq -r '.total')
if [ "$SUCCESS" = "true" ] && [ $ARTICLE_COUNT -gt 0 ]; then
    test_result 0 "親アカウントで記事取得成功 ($ARTICLE_COUNT件)"
else
    test_result 1 "親アカウントで記事取得失敗"
fi

# Test 4-2: 子アカウントで記事取得
echo "Test 4-2: 子アカウントで記事取得"
CHILD_ARTICLES=$(curl -s "$BASE_URL/api/articles/child/$CHILD_ID" \
  -H "X-Auth-Session: {\"userId\":\"$CHILD_ID\",\"userType\":\"child\",\"parentId\":\"$PARENT_ID\"}")
SUCCESS=$(echo $CHILD_ARTICLES | jq -r '.success')
CHILD_ARTICLE_COUNT=$(echo $CHILD_ARTICLES | jq -r '.total')
if [ "$SUCCESS" = "true" ] && [ $CHILD_ARTICLE_COUNT -gt 0 ]; then
    test_result 0 "子アカウントで記事取得成功 ($CHILD_ARTICLE_COUNT件)"
else
    test_result 1 "子アカウントで記事取得失敗"
fi

# Test 4-3: 認証なしで記事取得試行
echo "Test 4-3: 認証なしで記事取得試行"
NOAUTH_RESPONSE=$(curl -s "$BASE_URL/api/articles/child/$CHILD_ID")
ERROR=$(echo $NOAUTH_RESPONSE | jq -r '.error')
if [ ! -z "$ERROR" ] && [ "$ERROR" != "null" ]; then
    test_result 0 "認証なしで適切にエラー"
else
    test_result 1 "認証エラーハンドリング失敗"
fi

# ============================================
# 統合テスト: 永続性テスト
# ============================================
section "統合テスト 1: データ永続性テスト"

# Test I-1: ログアウト後の記事保持（親アカウント）
echo "Test I-1: ログアウト後の記事保持（親アカウント）"
# 新しいセッションで同じユーザーIDを使用して記事取得
PERSISTENCE_ARTICLES=$(curl -s "$BASE_URL/api/articles/recent?parentId=$PARENT_ID&limit=10" \
  -H "X-Auth-Session: {\"userId\":\"$PARENT_ID\",\"userType\":\"parent\"}")
PERS_ARTICLE_COUNT=$(echo $PERSISTENCE_ARTICLES | jq -r '.total')
if [ $PERS_ARTICLE_COUNT -eq $ARTICLE_COUNT ]; then
    test_result 0 "ログアウト後も記事が保持されている"
else
    test_result 1 "ログアウト後の記事保持失敗" "Expected: $ARTICLE_COUNT, Got: $PERS_ARTICLE_COUNT"
fi

# Test I-2: 招待コードで再ログイン後の記事保持
echo "Test I-2: 招待コードで再ログイン後の記事保持"
RELOGIN2_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$NEW_INV_CODE\"}")
RELOGIN2_ID=$(echo $RELOGIN2_RESPONSE | jq -r '.user.id')
RELOGIN2_ARTICLES=$(curl -s "$BASE_URL/api/articles/recent?parentId=$RELOGIN2_ID&limit=10" \
  -H "X-Auth-Session: {\"userId\":\"$RELOGIN2_ID\",\"userType\":\"parent\"}")
RELOGIN2_COUNT=$(echo $RELOGIN2_ARTICLES | jq -r '.total')
if [ "$RELOGIN2_ID" = "$PARENT_ID" ] && [ $RELOGIN2_COUNT -gt 0 ]; then
    test_result 0 "再ログイン後も記事が保持されている"
else
    test_result 1 "再ログイン後の記事保持失敗"
fi

# ============================================
# 統合テスト: エラーシナリオ
# ============================================
section "統合テスト 2: エラーシナリオ"

# Test E-1: URLなしで記事変換
echo "Test E-1: URLなしで記事変換"
ERROR_RESPONSE=$(curl -s -X POST $BASE_URL/api/articles/share \
  -H "Content-Type: application/json" \
  -H "X-Auth-Session: {\"userId\":\"$PARENT_ID\",\"userType\":\"parent\"}" \
  -d '{"childAge":8}')
ERROR=$(echo $ERROR_RESPONSE | jq -r '.error')
if [ ! -z "$ERROR" ] && [ "$ERROR" != "null" ]; then
    test_result 0 "URLなしで適切にエラー"
else
    test_result 1 "URLなしのエラーハンドリング失敗"
fi

# Test E-2: 存在しない親IDで記事取得
echo "Test E-2: 存在しない親IDで記事取得"
FAKE_ARTICLES=$(curl -s "$BASE_URL/api/articles/recent?parentId=00000000-0000-0000-0000-000000000000&limit=10" \
  -H "X-Auth-Session: {\"userId\":\"00000000-0000-0000-0000-000000000000\",\"userType\":\"parent\"}")
FAKE_COUNT=$(echo $FAKE_ARTICLES | jq -r '.total')
if [ $FAKE_COUNT -eq 0 ]; then
    test_result 0 "存在しない親IDで0件返却"
else
    test_result 1 "存在しない親IDのハンドリング失敗"
fi

# Test E-3: 子アカウント作成（認証なし）
echo "Test E-3: 子アカウント作成（認証なし）"
NOAUTH_CHILD=$(curl -s -X POST $BASE_URL/api/parent/children \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Unauthorized Child","childAge":8}')
ERROR=$(echo $NOAUTH_CHILD | jq -r '.error')
if [ ! -z "$ERROR" ] && [ "$ERROR" != "null" ]; then
    test_result 0 "認証なしで適切にエラー"
else
    test_result 1 "認証エラーハンドリング失敗"
fi

# ============================================
# テスト結果サマリー
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}テスト結果サマリー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "総テスト数: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "成功: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失敗: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 全てのテストが成功しました！${NC}"
    echo ""
    echo -e "${YELLOW}作成されたテストデータ:${NC}"
    echo -e "  - 招待コード: ${BLUE}$NEW_INV_CODE${NC}"
    echo -e "  - 親アカウントID: ${BLUE}$PARENT_ID${NC}"
    echo -e "  - 子アカウントID: ${BLUE}$CHILD_ID${NC}"
    echo -e "  - アクティベーションコード: ${BLUE}$ACTIVATION_CODE${NC}"
    echo -e "  - 記事ID: ${BLUE}$ARTICLE_ID${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ $FAILED_TESTS 個のテストが失敗しました${NC}"
    echo ""
    exit 1
fi
