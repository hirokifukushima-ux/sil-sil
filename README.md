# 📰 KnowNews - 親子ニュースアプリ

親子のコミュニケーションを深めるニュース共有アプリ。AIが子供の年齢に合わせてニュースを分かりやすく変換します。

## 🌟 特徴

- 🤖 **AI自動変換**: 難しいニュースも子供にとって分かりやすい文章に変換
- 👨‍👩‍👧‍👦 **親子の対話促進**: 同じ話題で家族のコミュニケーションをサポート
- 🎯 **年齢別対応**: 6歳から15歳まで、年齢に応じた内容調整
- 📱 **PWA対応**: スマートフォンにインストール可能
- 🎨 **子供向けデザイン**: カラフルで楽しい、子供が使いやすいUI

## 🚀 開始方法

### 必要な環境
- Node.js 18.x以上
- npm または yarn

### インストール

```bash
git clone <this-repository>
cd know-news
npm install
```

### 環境変数の設定

`.env.local.example`を参考に`.env.local`ファイルを作成：

```bash
cp .env.local.example .env.local
```

必要な環境変数：

```env
# OpenAI API キー（必須 - 実際のAI変換に必要）
OPENAI_API_KEY=your_openai_api_key_here

# LinkPreview API キー（オプション - 記事メタデータ取得用）
LINKPREVIEW_API_KEY=your_linkpreview_api_key_here
```

**🔑 OpenAI APIキーの取得方法:**
1. [OpenAI Platform](https://platform.openai.com/api-keys) にアクセス
2. アカウント作成・ログイン
3. "Create new secret key" でAPIキーを生成
4. `.env.local`ファイルに設定

**📰 LinkPreview APIキー（オプション）:**
- [LinkPreview.net](https://www.linkpreview.net/) でAPIキーを取得
- 未設定でもデモデータで動作します

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリにアクセス

## 📱 ページ構成

- **`/`** - メインホーム（親・子供選択画面）
- **`/parent`** - 親用ダッシュボード（記事登録・管理）
- **`/kids`** - 子供用ニュース一覧
- **`/kids/article/[id]`** - 記事詳細ページ（読書機能付き）

## 🛠 技術スタック

### フロントエンド
- **Next.js 15** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **PWA対応** (next-pwa)

### バックエンド
- **Next.js API Routes**
- **Node.js**

### 予定されている追加技術
- **OpenAI API** (AI文章変換)
- **Supabase/PostgreSQL** (データベース)
- **Firebase Auth** (認証)
- **LinkPreview API** (記事メタデータ)

## 🔧 API エンドポイント

### 記事管理
- `POST /api/articles/share` - 記事URL登録とAI変換
- `GET /api/articles/child/[childId]` - 子供用記事一覧取得
- `POST /api/articles/[id]/reaction` - 記事へのリアクション

## 🎮 使用方法

### 親の操作
1. `/parent` にアクセス
2. 子供を選択
3. 記事URLを入力して「記事を追加」
4. AIが自動変換してくれます

### 子供の操作
1. `/kids` にアクセス
2. カテゴリを選択
3. 「よんでみる！」で記事詳細を表示
4. リアクションボタンで感想を送信

## 📊 デモデータ

現在はサンプルデータを使用しています：
- 宇宙探査のニュース
- 恐竜化石発見のニュース  
- オリンピック関連のニュース

## 🔮 今後の開発予定

### Phase 1: MVP（完成済み）
- ✅ 基本的な記事共有機能
- ✅ AI変換機能（デモ実装）
- ✅ シンプルな表示画面
- ✅ PWA対応

### Phase 2: α版
- [ ] 実際のOpenAI API連携
- [ ] ユーザー認証システム
- [ ] データベース連携
- [ ] 記事メタデータ取得

### Phase 3: β版
- [ ] ゲーミフィケーション機能
- [ ] 詳細な年齢別対応
- [ ] 質問・コミュニケーション機能
- [ ] パフォーマンス最適化

### Phase 4: 正式版
- [ ] 音声読み上げ機能
- [ ] AIレコメンデーション
- [ ] 多言語対応
- [ ] 有料プラン機能

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエスト、Issue報告、機能提案を歓迎します！

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesをご利用ください。
