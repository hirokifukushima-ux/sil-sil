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

// 記事詳細を取得する関数（HTMLスクレイピング）
async function fetchArticleDetail(url: string): Promise<ArticleDetail> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // タイトル抽出
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s*-\s*Yahoo!ニュース.*$/, '').trim() : 'ニュース記事';

    // 本文抽出（複数パターンを試行）
    let content = '';
    const contentPatterns = [
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i
    ];

    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match) {
        content = match[1]
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (content.length > 100) break;
      }
    }

    if (!content || content.length < 50) {
      content = 'この記事の詳細内容は、下の「元記事を表示」ボタンから元記事でご確認ください。';
    }

    // 画像抽出
    const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
    const image = imageMatch ? imageMatch[1] : undefined;

    // 公開日時
    const dateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
                     html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
    const publishedAt = dateMatch ? dateMatch[1] : new Date().toISOString();

    return {
      title,
      content: content.substring(0, 1000), // 1000文字まで
      publishedAt,
      image,
      summary: content.substring(0, 200) + '...',
      url,
      source: url.includes('yahoo.co.jp') ? 'Yahoo!ニュース' : 'ニュースサイト'
    };

  } catch (error) {
    console.error('記事詳細取得エラー:', error);
    // フォールバック記事を返す
    return {
      title: 'ニュース記事',
      content: 'この記事の詳細内容は、下の「元記事を表示」ボタンから元記事でご確認ください。',
      publishedAt: new Date().toISOString(),
      summary: 'ニュース記事の詳細です',
      url,
      source: 'ニュースサイト'
    };
  }
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
    
    const article = await fetchArticleDetail(url);
    
    console.log(`✅ 記事詳細取得完了: ${article.title}`);
    
    return NextResponse.json({
      success: true,
      article,
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