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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Yahoo!ニュース専用のタイトル抽出
    let title = 'ニュース記事';
    const yahooTitlePatterns = [
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
      /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*>([^<]+)<\/h1>/i
    ];

    for (const pattern of yahooTitlePatterns) {
      const match = html.match(pattern);
      if (match) {
        title = match[1]
          .replace(/\s*-\s*Yahoo!ニュース.*$/, '')
          .replace(/\s*\|\s*Yahoo!ニュース.*$/, '')
          .trim();
        if (title.length > 10) break;
      }
    }

    // Yahoo!ニュース専用の本文抽出
    let content = '';
    const yahooContentPatterns = [
      // Yahoo!ニュースの記事本文パターン
      /<div[^>]*class="[^"]*sc-[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*article_body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*news_body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*data-module="[^"]*ArticleBody[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // 一般的なパターン
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i
    ];

    for (const pattern of yahooContentPatterns) {
      const match = html.match(pattern);
      if (match) {
        let rawContent = match[1];
        
        // 不要な要素を除去
        content = rawContent
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<aside[\s\S]*?<\/aside>/gi, '')
          .replace(/<div[^>]*class="[^"]*ad[^"]*"[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*class="[^"]*sns[^"]*"[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*class="[^"]*share[^"]*"[\s\S]*?<\/div>/gi, '')
          // HTMLタグを除去してテキストのみ抽出
          .replace(/<br[^>]*>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .replace(/\n\s+/g, '\n')
          .trim();
        
        if (content.length > 200) break;
      }
    }

    // 本文が短い場合はp要素から抽出を試行
    if (!content || content.length < 100) {
      const paragraphs = html.match(/<p[^>]*>([^<]+(?:<[^>]*>[^<]*<\/[^>]*>[^<]*)*)<\/p>/gi);
      if (paragraphs && paragraphs.length > 0) {
        content = paragraphs
          .map(p => p.replace(/<[^>]+>/g, '').trim())
          .filter(text => text.length > 20)
          .slice(0, 10) // 最初の10段落まで
          .join('\n\n');
      }
    }

    if (!content || content.length < 50) {
      content = 'この記事の詳細内容は、下の「元記事を表示」ボタンから元記事でご確認ください。';
    }

    // 画像抽出（Yahoo!ニュース対応）
    let image = undefined;
    const imagePatterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<img[^>]*class="[^"]*article[^"]*"[^>]*src=["']([^"']+)["']/i,
      /<img[^>]*src=["']([^"']+)["'][^>]*class="[^"]*article[^"]*"/i,
      /<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|gif))["']/i
    ];

    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match) {
        image = match[1].startsWith('http') ? match[1] : `https:${match[1]}`;
        break;
      }
    }

    // 公開日時の抽出
    const datePatterns = [
      /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
      /<time[^>]*datetime=["']([^"']+)["']/i,
      /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)</i,
      /(\d{4}\/\d{1,2}\/\d{1,2})/
    ];

    let publishedAt = new Date().toISOString();
    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          publishedAt = new Date(match[1]).toISOString();
          break;
        } catch {
          continue;
        }
      }
    }

    return {
      title,
      content: content.substring(0, 3000), // 3000文字まで拡張
      publishedAt,
      image,
      summary: content.substring(0, 300) + '...',
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