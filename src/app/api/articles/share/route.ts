import { NextRequest, NextResponse } from 'next/server';
import { fetchArticleMetadata, convertToArticleContent } from '@/lib/article-fetcher';
import { convertArticleForChild } from '@/lib/openai';
import { saveArticle } from '@/lib/article-store';

interface ShareArticleRequest {
  url: string;
  childAge: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ShareArticleRequest = await request.json();
    const { url, childAge } = body;
    
    // バリデーション
    if (!url) {
      return NextResponse.json(
        { error: 'URLが必要です' },
        { status: 400 }
      );
    }
    
    if (!childAge || childAge < 6 || childAge > 15) {
      return NextResponse.json(
        { error: '年齢は6歳から15歳の間で入力してください' },
        { status: 400 }
      );
    }

    // URLの形式チェック
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: '有効なURLを入力してください' },
        { status: 400 }
      );
    }
    
    // 1. 記事メタデータを取得
    console.log('📰 記事メタデータを取得中...', url);
    const rawArticleData = await fetchArticleMetadata(url);
    const articleContent = convertToArticleContent(rawArticleData);
    
    console.log('✅ 記事データ取得完了:', {
      title: articleContent.title.substring(0, 50),
      contentLength: articleContent.content.length,
      category: articleContent.category
    });
    
    // 2. AIで子供向けに変換
    console.log('🤖 AI変換を実行中...', { childAge, category: articleContent.category });
    const convertedArticle = await convertArticleForChild(articleContent, childAge);
    
    console.log('✅ AI変換完了:', {
      originalTitle: articleContent.title.substring(0, 30),
      convertedTitle: convertedArticle.title.substring(0, 30),
      contentLength: convertedArticle.content.length
    });
    
    // 3. インメモリストアに保存
    const articleData = {
      id: Math.floor(Date.now() + Math.random() * 1000), // 整数のID生成
      originalUrl: url,
      childAge,
      originalTitle: articleContent.title,
      convertedTitle: convertedArticle.title,
      originalContent: articleContent.content,
      convertedContent: convertedArticle.content,
      convertedSummary: convertedArticle.summary,
      category: convertedArticle.category,
      createdAt: new Date().toISOString(),
      status: 'completed',
      siteName: rawArticleData.site_name,
      image: rawArticleData.image
    };
    
    const savedArticle = saveArticle(articleData);
    
    console.log('🎉 記事の変換が完了しました:', savedArticle.id);
    
    return NextResponse.json({
      success: true,
      article: savedArticle,
      message: 'AI変換が完了しました！子供がニュースページで読めるようになりました。',
      metadata: {
        processingTime: Date.now(),
        originalLength: articleContent.content.length,
        convertedLength: convertedArticle.content.length,
        compressionRatio: Math.round((convertedArticle.content.length / articleContent.content.length) * 100)
      }
    });
    
  } catch (error) {
    console.error('❌ 記事処理エラー:', error);
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
    }
    
    return NextResponse.json(
      { 
        error: `記事の処理中にエラーが発生しました`,
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'URLが正しいか確認し、しばらく待ってから再試行してください。'
      },
      { status: 500 }
    );
  }
}