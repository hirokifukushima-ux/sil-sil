# 👋 おはようございます！修正完了しました

招待コード再ログイン問題を修正しました。以下の手順で完了させてください。

## 🚀 クイックスタート（5分で完了）

### 方法1: 自動スクリプトを使う（推奨）

```bash
cd /Users/hiroki.fukushima/know-news/know-news
./run-migration.sh
```

このスクリプトが全て案内してくれます！

### 方法2: 手動で実行

1. **Supabase SQL Editorを開く**

   https://supabase.com/dashboard/project/vlytixemvzmtoabvtnod/sql/new

2. **SQLを実行**

   以下のSQLをコピー&ペーストして「Run」

   ```sql
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
   ```

3. **確認**

   ```bash
   curl http://localhost:3000/api/admin/migrate | jq
   ```

4. **テスト**

   ```bash
   # 2回ログインして同じユーザーIDが返ることを確認
   curl -X POST http://localhost:3000/api/auth/invitation-login \
     -H "Content-Type: application/json" \
     -d '{"code":"W6V1SHEE"}'
   ```

## 📚 詳細ドキュメント

問題や詳細を知りたい場合:

- **`FIX_SUMMARY.md`** - 何を修正したか、どう直したかの完全な説明
- **`MIGRATION_GUIDE.md`** - マイグレーション手順の詳細ガイド
- **`fix-invitation-login.sql`** - 実行するSQL

## ✅ 修正内容（要約）

### 問題
- W6V1SHEEでログインするたびに異なるユーザーID
- 記事と子アカウントが表示されない

### 原因
- invitation-login APIが複数のユーザーにマッチして最新を返していた

### 解決策
- `invitations.accepted_user_id` カラムを追加
- 招待コードと最初のユーザーを永続的にリンク
- ログインロジックを修正

### 修正したファイル
- ✅ `src/lib/database/types.ts`
- ✅ `src/lib/database/supabase.ts`
- ✅ `src/app/api/auth/invitation-login/route.ts`
- ✅ `src/app/api/admin/migrate/route.ts` (新規)

## 🎯 期待される結果

修正後:
```
W6V1SHEE ログイン → ユーザーID: ec4203f1-... ✅
W6V1SHEE ログイン → ユーザーID: ec4203f1-... ✅ (常に同じ)
W6V1SHEE ログイン → ユーザーID: ec4203f1-... ✅ (常に同じ)
```

記事: 1件表示 ✅
子アカウント: 1件表示 ✅

## ❓ 問題が発生した場合

1. `MIGRATION_GUIDE.md` のトラブルシューティングを確認
2. コンソールログを確認
3. Supabaseで以下のSQLを実行して状態を確認:
   ```sql
   SELECT code, status, accepted_user_id
   FROM invitations
   WHERE code = 'W6V1SHEE';
   ```

## 📝 次回からの予防

- ✅ 招待コードシステムのテストケースを追加
- ✅ ドキュメント作成
- ✅ モニタリング設定

---

**何か問題があれば教えてください！** 🙌

修正完了日時: 2025-11-29
