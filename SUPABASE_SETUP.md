# シルシル - Supabaseセットアップガイド

## 1. Supabaseプロジェクト作成

1. [Supabase](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubでサインアップ/ログイン
4. Organization選択（個人アカウントでOK）
5. 新しいプロジェクトを作成：
   - **Project name**: `know-news-shirushiru`
   - **Database Password**: 強いパスワードを設定（必ずメモ！）
   - **Region**: `Northeast Asia (Tokyo)` または `Southeast Asia (Singapore)`

## 2. データベーススキーマ作成

1. Supabaseダッシュボードで「SQL Editor」を開く
2. プロジェクトルートの `supabase-schema.sql` の内容をコピー
3. 「New query」で貼り付けて実行
4. 成功すると以下のテーブルが作成される：
   - `users` - ユーザー情報
   - `articles` - 記事データ  
   - `article_reactions` - いいねなどのリアクション
   - `questions` - 子どもからの質問

## 3. 環境変数設定

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の情報を取得：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ0eXAiOiJKV1Qi...`

3. `.env.local` ファイルを更新：

```bash
# データベース機能を有効化
NEXT_PUBLIC_USE_DATABASE=true

# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=あなたのプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたの匿名キー
```

## 4. 接続テスト

1. 開発サーバーを再起動：
```bash
npm run dev
```

2. デバッグエンドポイントで接続確認：
```bash
curl http://localhost:3000/api/debug/database
```

3. 成功すると以下のような応答が返される：
```json
{
  "success": true,
  "health": {
    "provider": "supabase",
    "healthy": true
  },
  "environment": {
    "USE_DATABASE": "true",
    "SUPABASE_URL_SET": true,
    "SUPABASE_KEY_SET": true
  }
}
```

## 5. データ移行（オプション）

既存のメモリ内データを保持したい場合：

1. 現在のデータをエクスポート：
```bash
curl http://localhost:3000/api/debug/database > current-data.json
```

2. Supabase有効化後に手動でデータ作成、または移行スクリプト実行

## トラブルシューティング

### よくある問題

1. **接続エラー**
   - URLとAPIキーが正しく設定されているか確認
   - Supabaseプロジェクトがアクティブな状態か確認

2. **テーブルが見つからない**
   - `supabase-schema.sql` が正しく実行されているか確認
   - Supabaseダッシュボードの「Table Editor」でテーブルを確認

3. **権限エラー**  
   - Row Level Security (RLS) ポリシーが正しく設定されているか確認
   - 必要に応じてポリシーを調整

### ロールバック方法

問題が発生した場合、即座にメモリ基盤に戻せます：

```bash
# .env.localを編集
NEXT_PUBLIC_USE_DATABASE=false
```

開発サーバーを再起動すれば、自動的にメモリプロバイダーに切り替わります。

## セキュリティ考慮事項

- RLSポリシーは開発用の基本設定です
- 本番環境では適切な認証基盤のポリシーに変更してください
- データベースパスワードは安全に保管してください
- API キーは環境変数経由でのみ管理してください