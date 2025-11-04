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
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URLパラメータが必要です'
      }, { status: 400 });
    }
    
    console.log(`🔄 記事詳細取得開始: ${url}`);
    
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
    
    return NextResponse.json({
      success: true,
      article: fallbackArticle,
      fetchedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('記事詳細取得エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: '記事の詳細取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}