import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const articleUrl = url.searchParams.get('url');
  
  if (!articleUrl) {
    return NextResponse.json({
      success: false,
      error: 'URLパラメータが必要です'
    }, { status: 400 });
  }
  
  // 最小限のフォールバック記事を返す
  return NextResponse.json({
    success: true,
    article: {
      title: 'ニュース記事',
      content: 'この記事の詳細内容は、下の「元記事を表示」ボタンから元記事でご確認ください。',
      publishedAt: '2025-11-04T00:00:00.000Z',
      summary: 'ニュース記事の詳細です',
      url: articleUrl,
      source: 'ニュースサイト'
    },
    fetchedAt: '2025-11-04T00:00:00.000Z'
  });
}