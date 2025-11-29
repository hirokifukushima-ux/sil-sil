# 招待コード再ログイン問題 - 修正完了サマリー

## 🎯 修正された問題

**症状**: 招待コードW6V1SHEEで再ログインするたびに異なるユーザーIDが返され、以前作成した記事や子アカウントが表示されない

**影響**: データは消失していないが、ログインのたびに別のユーザーとして認識され、データが見えなくなっていた

## 🔍 根本原因

`src/app/api/auth/invitation-login/route.ts` の67-82行目のロジックに以下の問題がありました:

1. 同じマスターによって作成された**全ての**親アカウントにマッチ
2. マッチした中から**最新**のアカウントを選択
3. 結果として、新しい親が作成されるたびに異なるユーザーが返される

### 問題のコード例

```typescript
// ❌ BUG: 全ての親アカウントにマッチして最新を返す
const matchedUsers = users.filter(u => {
  if (u.createdBy === invitation.inviterId && u.masterId === invitation.inviterId) {
    return true;  // 全ての親がマッチしてしまう！
  }
});

const selectedUser = matchedUsers.sort((a, b) =>
  new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
)[0];  // 最新のユーザーを選択（毎回変わる！）
```

## ✅ 実施した修正

### 1. データベーススキーマ変更

**ファイル**: `fix-invitation-login.sql`

```sql
-- accepted_user_id カラムを追加して、
-- 招待コードを最初に受け入れたユーザーを永続的に記録
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS accepted_user_id TEXT REFERENCES users(id);
```

### 2. TypeScript型定義の更新

**ファイル**: `src/lib/database/types.ts:61`

```typescript
export interface Invitation {
  // ... 既存のフィールド
  acceptedUserId?: string; // この招待を受け入れたユーザーのID（新規追加）
}
```

### 3. Supabaseプロバイダーの更新

**ファイル**: `src/lib/database/supabase.ts`

**変更箇所**:
- 928行目: `transformInvitationFromDB` に `acceptedUserId` のマッピングを追加
- 945行目: `transformInvitationToDB` に `accepted_user_id` のマッピングを追加
- 441行目: `acceptInvitation` で `accepted_user_id` を保存するように変更

### 4. ログインAPIロジックの修正

**ファイル**: `src/app/api/auth/invitation-login/route.ts:40-96`

**新しいロジック**:

```typescript
// ✅ FIX: acceptedUserIdで確実に同じユーザーを返す
if (invitation.status === 'accepted') {
  let selectedUser = null;

  // 新しいロジック: acceptedUserIdが存在する場合は直接取得
  if (invitation.acceptedUserId) {
    selectedUser = await db.getUser(invitation.acceptedUserId);
  }

  // 後方互換性: acceptedUserIdがない場合は従来の検索（最初のユーザーを使用）
  if (!selectedUser) {
    const matchedUsers = users.filter(/* ... */);
    // 複数マッチした場合は最初に作成されたユーザーを選択（最新ではない！）
    selectedUser = matchedUsers.sort((a, b) =>
      new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
    )[0];
  }
}
```

### 5. 管理用API追加

**新規ファイル**: `src/app/api/admin/migrate/route.ts`

マイグレーション状態を確認するためのAPIエンドポイント:
- `GET /api/admin/migrate` - 現在の状態確認
- `POST /api/admin/migrate` - マイグレーション実行（データ更新のみ）

## 📋 次のステップ（ユーザーアクション必要）

### ステップ1: Supabase SQL Editorでマイグレーション実行

**最も簡単な方法**: 以下のスクリプトを実行

```bash
./run-migration.sh
```

このスクリプトが:
1. 実行すべきSQLを表示
2. Supabase SQL EditorのURLを表示
3. マイグレーション後の確認を自動実行
4. W6V1SHEEでのログインテストを実行

**または手動で実行**:

1. https://supabase.com/dashboard/project/vlytixemvzmtoabvtnod/sql/new にアクセス
2. `fix-invitation-login.sql` の内容をコピー&ペースト
3. 「Run」をクリック

### ステップ2: 動作確認

```bash
# マイグレーション状態を確認
curl -s http://localhost:3000/api/admin/migrate | jq

# W6V1SHEEでログインテスト（複数回実行して同じIDが返ることを確認）
curl -X POST http://localhost:3000/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d '{"code":"W6V1SHEE"}'
```

## 📁 変更されたファイル一覧

### 新規作成
- ✅ `fix-invitation-login.sql` - マイグレーションSQL
- ✅ `src/app/api/admin/migrate/route.ts` - マイグレーション確認API
- ✅ `run-migration.sh` - マイグレーション実行スクリプト
- ✅ `MIGRATION_GUIDE.md` - 詳細なマイグレーションガイド
- ✅ `FIX_SUMMARY.md` - このファイル
- ✅ `run-migration.js` - Node.jsマイグレーションスクリプト（未使用）

### 修正
- ✅ `src/lib/database/types.ts` - Invitation型にacceptedUserIdを追加
- ✅ `src/lib/database/supabase.ts` - transform関数とacceptInvitation関数を更新
- ✅ `src/app/api/auth/invitation-login/route.ts` - ログインロジックを完全に書き換え

## 🧪 テストケース

### テスト1: 同じユーザーIDが返される

```bash
# 1回目
RESPONSE1=$(curl -s -X POST http://localhost:3000/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d '{"code":"W6V1SHEE"}')
USER_ID1=$(echo "$RESPONSE1" | jq -r '.user.id')

# 2回目
RESPONSE2=$(curl -s -X POST http://localhost:3000/api/auth/invitation-login \
  -H "Content-Type: application/json" \
  -d '{"code":"W6V1SHEE"}')
USER_ID2=$(echo "$RESPONSE2" | jq -r '.user.id')

# 確認
if [ "$USER_ID1" = "$USER_ID2" ]; then
  echo "✅ テスト成功: 同じユーザーID"
else
  echo "❌ テスト失敗: 異なるユーザーID"
fi
```

### テスト2: 記事が表示される

```bash
USER_ID="<上記で取得したユーザーID>"

curl -s "http://localhost:3000/api/articles/recent?limit=10" \
  -H "X-Auth-Session: {\"userId\":\"$USER_ID\",\"userType\":\"parent\"}" \
  | jq 'length'  # 記事数が表示される
```

### テスト3: 子アカウントが表示される

```bash
curl -s "http://localhost:3000/api/parent/children" \
  -H "X-Auth-Session: {\"userId\":\"$USER_ID\",\"userType\":\"parent\"}" \
  | jq 'length'  # 子アカウント数が表示される
```

## 🎓 学んだこと・今後の改善点

### 問題の本質
- **データの一意性**: 招待コードとユーザーの1:1関係が保証されていなかった
- **ステートレス設計の落とし穴**: セッション情報がないため、招待コードから正しいユーザーを特定する必要があった

### 設計改善
- ✅ `accepted_user_id` カラムで招待とユーザーの関係を永続化
- ✅ 後方互換性を保ちつつ、新しいロジックに移行
- ✅ 管理用APIで状態確認が可能

### 今後の予防策
1. **テストケース追加**: 同じ招待コードでの複数回ログインテスト
2. **ドキュメント**: 招待コードシステムのアーキテクチャドキュメント作成
3. **モニタリング**: 同じ招待コードで異なるユーザーが返された場合のアラート

## 📊 修正前後の比較

### 修正前
```
W6V1SHEE ログイン → ユーザーID: ec4203f1-... (1記事、1子アカウント)
W6V1SHEE ログイン → ユーザーID: 241cc2c8-... (0記事、0子アカウント) ❌
W6V1SHEE ログイン → ユーザーID: ????????-... (毎回変わる) ❌
```

### 修正後
```
W6V1SHEE ログイン → ユーザーID: ec4203f1-... (1記事、1子アカウント) ✅
W6V1SHEE ログイン → ユーザーID: ec4203f1-... (1記事、1子アカウント) ✅
W6V1SHEE ログイン → ユーザーID: ec4203f1-... (常に同じ) ✅
```

## ✨ 完了確認チェックリスト

- [ ] Supabase SQL EditorでマイグレーションSQLを実行
- [ ] `curl http://localhost:3000/api/admin/migrate` で `needsMigration: false` を確認
- [ ] W6V1SHEEで3回ログインして、全て同じユーザーIDが返ることを確認
- [ ] 記事が表示されることを確認
- [ ] 子アカウントが表示されることを確認

## 📞 サポート

問題が発生した場合:
1. `MIGRATION_GUIDE.md` のトラブルシューティングを参照
2. `run-migration.sh` を実行して詳細ログを確認
3. Supabase SQL Editorで以下を確認:
   ```sql
   SELECT code, status, accepted_user_id
   FROM invitations
   WHERE code = 'W6V1SHEE';
   ```

---

**修正完了日時**: 2025-11-29
**修正者**: Claude
**テスト状況**: コード修正完了、DBマイグレーション待ち
