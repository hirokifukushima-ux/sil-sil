#!/bin/bash

# Vercel環境変数設定スクリプト
echo "🚀 Vercel環境変数を設定中..."

# .env.localから環境変数を読み込み
if [ -f .env.local ]; then
    echo "📂 .env.localファイルを読み込み中..."
    source .env.local
else
    echo "❌ .env.localファイルが見つかりません"
    exit 1
fi

# 必要な環境変数をチェック
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEYが設定されていません"
    exit 1
fi

echo "✅ 環境変数読み込み完了"

# Vercel環境変数設定（Production, Preview, Development）
echo "🔧 Vercel環境変数を設定中..."

# OpenAI API Key
vercel env add OPENAI_API_KEY production --force
echo "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY preview --force
echo "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY development --force

# Database設定
echo "false" | vercel env add NEXT_PUBLIC_USE_DATABASE production --force
echo "false" | vercel env add NEXT_PUBLIC_USE_DATABASE preview --force
echo "false" | vercel env add NEXT_PUBLIC_USE_DATABASE development --force

# Supabase設定
echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force
echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview --force
echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL development --force

echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview --force
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development --force

# Auth設定
echo "false" | vercel env add NEXT_PUBLIC_SKIP_AUTH production --force
echo "false" | vercel env add NEXT_PUBLIC_SKIP_AUTH preview --force
echo "true" | vercel env add NEXT_PUBLIC_SKIP_AUTH development --force

echo "✅ 環境変数設定完了"
echo "🚀 新しいデプロイをトリガー中..."

# 新しいデプロイをトリガー
vercel --prod

echo "🎉 設定完了！本番環境でAPIが動作するはずです。"