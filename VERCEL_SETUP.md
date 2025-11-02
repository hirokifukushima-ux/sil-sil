# Vercel環境変数設定手順

本番環境で正常に動作させるため、以下の環境変数をVercelダッシュボードで設定してください。

## 必須環境変数

### 1. OpenAI API設定
```
OPENAI_API_KEY=[.env.localファイルから実際のキーを取得してください]
```

### 2. データベース設定  
```
NEXT_PUBLIC_USE_DATABASE=false
NEXT_PUBLIC_SUPABASE_URL=[.env.localファイルから実際のURLを取得してください]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[.env.localファイルから実際のキーを取得してください]
```

### 3. アプリケーション設定
```
NODE_ENV=production
NEXT_PUBLIC_SKIP_AUTH=false
```

## Vercel設定手順

1. Vercelダッシュボードにアクセス: https://vercel.com/dashboard
2. プロジェクト `sil-sil` を選択
3. Settings > Environment Variables に移動
4. 上記の環境変数を一つずつ追加
5. 環境は `Production`, `Preview`, `Development` すべてにチェック
6. 保存後、新しいデプロイをトリガー

## デプロイ確認方法

環境変数設定後、以下をテスト：
- https://sil-sil.vercel.app/api/news/list
- https://sil-sil.vercel.app/api/news/yahoo-detail?url=[Yahoo記事URL]
- https://sil-sil.vercel.app/api/articles/child/8

すべて正常にJSONを返すことを確認してください。