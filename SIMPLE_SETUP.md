# ⚡ 5分で完了！Vercel環境変数設定

## 🎯 必要な作業（5つだけ）

### 1. Vercel設定ページを開く
👉 **[ここをクリック](https://vercel.com/hirokifukushima-ux/sil-sil/settings/environment-variables)**

### 2. 以下の環境変数を追加（コピー＆ペースト）

**① OPENAI_API_KEY**
- Key: `OPENAI_API_KEY`
- Value: `.env.localファイルから sk-proj- で始まる値をコピー`
- Environment: **Production, Preview, Development 全てチェック**

**② NEXT_PUBLIC_USE_DATABASE**  
- Key: `NEXT_PUBLIC_USE_DATABASE`
- Value: `false`
- Environment: **全てチェック**

**③ NEXT_PUBLIC_SUPABASE_URL**
- Key: `NEXT_PUBLIC_SUPABASE_URL` 
- Value: `.env.localファイルから https://vlytix で始まる値をコピー`
- Environment: **全てチェック**

**④ NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: `.env.localファイルから eyJhbGci で始まる値をコピー`
- Environment: **全てチェック**

**⑤ NEXT_PUBLIC_SKIP_AUTH**
- Key: `NEXT_PUBLIC_SKIP_AUTH`
- Value: `false`
- Environment: **全てチェック**

### 3. 新しいデプロイ
👉 **[ここをクリック](https://vercel.com/hirokifukushima-ux/sil-sil/deployments)** → 「**Redeploy**」ボタン

## ✅ 完了確認（約3分後）
- https://sil-sil.vercel.app/api/news/list
- 正常にJSONが返れば設定完了！

---
**💡 ポイント**: 各環境変数で「Production, Preview, Development」**全てにチェック**を入れることが重要です