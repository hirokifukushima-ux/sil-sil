import { NextRequest, NextResponse } from 'next/server';

export interface ArticleDetail {
  title: string;
  content: string;
  publishedAt: string;
  image?: string;
  summary: string;
  url: string;
  source?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 記事詳細API開始 - リクエスト受信');
    
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    console.log(`📝 取得URL: ${url}`);
    
    if (!url) {
      console.log('❌ URLパラメータなし');
      return NextResponse.json({
        success: false,
        error: 'URLパラメータが必要です'
      }, { status: 400 });
    }
    
    console.log(`🔄 記事詳細取得開始: ${url}`);
    
    // URL検証
    try {
      new URL(url);
    } catch (urlError) {
      console.log(`❌ 無効なURL: ${url}`, urlError);
      return NextResponse.json({
        success: false,
        error: '無効なURLです',
        details: `Invalid URL: ${url}`
      }, { status: 400 });
    }
    
    // シンプルなフォールバック記事を返す（JSDOMを使用しない）
    const fallbackArticle: ArticleDetail = {
      title: 'ニュース記事',
      content: 'この記事の詳細内容は、下の「元記事を表示」ボタンから元記事でご確認ください。',
      publishedAt: new Date().toISOString(),
      summary: 'ニュース記事の詳細です',
      url: url,
      source: 'ニュースサイト'
    };
    
    console.log(`✅ 記事詳細取得完了（フォールバック）`);
    
    const response = {
      success: true,
      article: fallbackArticle,
      fetchedAt: new Date().toISOString(),
      debug: {
        environment: process.env.NODE_ENV || 'unknown',
        vercel: !!process.env.VERCEL,
        timestamp: Date.now()
      }
    };
    
    console.log('📤 レスポンス準備完了');
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ 記事詳細取得エラー:', error);
    console.error('❌ エラー詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json({
      success: false,
      error: '記事の詳細取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        environment: process.env.NODE_ENV || 'unknown',
        vercel: !!process.env.VERCEL,
        timestamp: Date.now(),
        errorType: error instanceof Error ? error.name : 'Unknown'
      }
    }, { status: 500 });
  }
}