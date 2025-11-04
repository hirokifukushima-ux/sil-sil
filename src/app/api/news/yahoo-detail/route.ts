import { NextRequest, NextResponse } from 'next/server';

// フォールバック記事作成関数
function createFallbackArticle(url: string, html?: string): YahooArticleDetail {
  let title = 'Yahoo!ニュースの記事';
  let content = 'この記事の詳細内容を取得できませんでした。元記事をご確認ください。';
  
  if (html) {
    // 正規表現でタイトルを抽出
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\s*-\s*Yahoo!ニュース.*$/, '').trim();
    }
    
    // 基本的なメタタグ情報を抽出
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) {
      content = descMatch[1];
    }
  }
  
  return {
    title,
    content,
    publishedAt: new Date().toISOString(),
    summary: content.substring(0, 100),
    url,
    source: 'Yahoo!ニュース'
  };
}

async function getActualArticleUrl(pickupUrl: string): Promise<string> {
  try {
    const response = await fetch(pickupUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.warn('pickup URLの取得に失敗、元URLを使用');
      return pickupUrl;
    }
    
    const html = await response.text();
    
    // 正規表現で記事URLを検索
    const articleUrlPatterns = [
      /href=["']([^"']*news\.yahoo\.co\.jp\/articles\/[^"']*)["']/gi,
      /href=["']([^"']*\/articles\/[^"']*)["']/gi,
      /url=([^&\s]*news\.yahoo\.co\.jp\/articles\/[^&\s]*)/gi
    ];
    
    for (const pattern of articleUrlPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        let url = match[1];
        if (url.startsWith('/')) {
          url = `https://news.yahoo.co.jp${url}`;
        }
        if (url.includes('/articles/')) {
          console.log(`✅ 実際の記事URL発見: ${url}`);
          return url;
        }
      }
    }
    
    // メタリフレッシュもチェック
    const metaRefreshMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']([^"']*)["']/i);
    if (metaRefreshMatch) {
      const content = metaRefreshMatch[1];
      const urlMatch = content.match(/url=(.+)/);
      if (urlMatch) {
        const redirectUrl = urlMatch[1];
        if (redirectUrl.includes('/articles/')) {
          console.log(`✅ リダイレクト先URL発見: ${redirectUrl}`);
          return redirectUrl;
        }
      }
    }
    
    console.warn('実際の記事URLが見つからない、元URLを使用');
    return pickupUrl;
    
  } catch (error) {
    console.error('pickup URL解析エラー:', error);
    return pickupUrl;
  }
}

export interface YahooArticleDetail {
  title: string;
  content: string;
  publishedAt: string;
  image?: string;
  summary: string;
  url: string;
  source?: string;
}

async function scrapeYahooArticle(url: string): Promise<YahooArticleDetail> {
  try {
    console.log(`🔄 Yahoo!記事スクレイピング開始: ${url}`);
    
    let targetUrl = url;
    
    // pickup URLの場合、実際の記事URLを取得
    if (url.includes('/pickup/')) {
      try {
        console.log('🔍 pickup URLを検出、実際の記事URLを取得中...');
        targetUrl = await getActualArticleUrl(url);
        console.log(`📰 実際の記事URL: ${targetUrl}`);
      } catch (error) {
        console.warn('pickup URL解析に失敗、元URLを使用:', error);
        targetUrl = url;
      }
    }
    
    // フェッチ
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000 // 15秒のタイムアウト
    } as any);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // 正規表現でタイトルを抽出
    let title = '';
    const titlePatterns = [
      /<h1[^>]*data-ual-module=["']Headline["'][^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*class="[^"]*sc-[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<title[^>]*>([^<]+)<\/title>/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1].trim()) {
        title = match[1].trim().replace(/\s*-\s*Yahoo!ニュース.*$/, '');
        console.log(`✅ タイトル取得成功: ${title.substring(0, 50)}...`);
        break;
      }
    }
    
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitleMatch) {
        title = ogTitleMatch[1].trim();
      } else {
        title = 'Yahoo!ニュースの記事';
      }
    }
    
    // 正規表現で本文を抽出
    let content = '';
    const contentPatterns = [
      // Yahoo!ニュース特有のパターン
      /<div[^>]*class="[^"]*highLight[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*data-ual-module=["']Article["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*sc-[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi
    ];
    
    for (const pattern of contentPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      if (matches.length > 0) {
        const extractedContent = matches.map(match => {
          // HTMLタグを除去
          const text = match[1]
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[^;]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // フィルタリング
          const paragraphs = text.split(/[。！？]/).filter(p => {
            const clean = p.trim();
            return clean.length > 15 &&
                   !clean.includes('シェア') &&
                   !clean.includes('ツイート') &&
                   !clean.includes('関連記事') &&
                   !clean.includes('続きを読む') &&
                   !clean.includes('Yahoo!ニュース個人') &&
                   !clean.includes('※この記事は') &&
                   !clean.includes('写真') &&
                   !clean.includes('画像') &&
                   !clean.match(/^[a-zA-Z\s\.\(\)]+$/);
          });
          
          return paragraphs.join('。');
        }).join('\n\n');
        
        if (extractedContent.length > content.length && extractedContent.length > 100) {
          content = extractedContent;
          console.log(`✅ コンテンツ取得成功: ${content.length}文字`);
          break;
        }
      }
    }
    
    // フォールバック：段落タグから直接抽出
    if (!content || content.length < 100) {
      console.log('⚠️ 代替方法でコンテンツ取得を試行');
      const paragraphMatches = Array.from(html.matchAll(/<p[^>]*>([^<]+)<\/p>/gi));
      const paragraphs = paragraphMatches
        .map(match => match[1].replace(/&[^;]+;/g, ' ').trim())
        .filter(text => {
          return text.length > 30 &&
                 text.includes('。') &&
                 !text.includes('シェア') &&
                 !text.includes('ツイート') &&
                 !text.includes('Yahoo!') &&
                 !text.includes('配信');
        });
      
      content = paragraphs.slice(0, 10).join('\n\n');
      console.log(`📄 代替コンテンツ長: ${content.length}文字`);
    }
    
    // 正規表現で画像を抽出
    let image = '';
    
    // OGイメージを優先的に取得
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      let ogImage = ogImageMatch[1];
      if (!ogImage.startsWith('http')) {
        ogImage = `https:${ogImage}`;
      }
      
      // ロゴやシステム画像を除外
      const isSystemImage = (
        ogImage.includes('logo') ||
        ogImage.includes('icon') ||
        ogImage.includes('favicon') ||
        ogImage.includes('/default/') ||
        ogImage.includes('/common/') ||
        ogImage.includes('/ui/')
      );
      
      if (!isSystemImage) {
        image = ogImage;
        console.log(`✅ OG画像を使用: ${image.substring(0, 80)}...`);
      }
    }
    
    // OG画像がない場合、記事内の画像を検索
    if (!image) {
      const imgMatches = Array.from(html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi));
      for (const imgMatch of imgMatches) {
        let src = imgMatch[1];
        if (!src.startsWith('http')) {
          src = `https:${src}`;
        }
        
        // 除外条件
        const isExcluded = (
          src.includes('logo') ||
          src.includes('icon') ||
          src.includes('favicon') ||
          src.includes('avatar') ||
          src.includes('profile') ||
          src.includes('ad') ||
          src.includes('banner') ||
          src.includes('150x') ||
          src.includes('100x') ||
          src.includes('50x') ||
          src.includes('/default/') ||
          src.includes('/common/') ||
          src.includes('/ui/')
        );
        
        if (!isExcluded) {
          image = src;
          console.log(`✅ 記事画像を使用: ${image.substring(0, 80)}...`);
          break;
        }
      }
    }
    
    // 正規表現で公開日時を取得
    let publishedAt = new Date().toISOString();
    const timePatterns = [
      /<time[^>]*datetime=["']([^"']+)["']/i,
      /<time[^>]*>([^<]+)<\/time>/i,
      /<div[^>]*data-ual-module=["']Time["'][^>]*>([^<]+)<\/div>/i
    ];
    
    for (const pattern of timePatterns) {
      const match = html.match(pattern);
      if (match && match[1].trim()) {
        publishedAt = match[1].trim();
        break;
      }
    }
    
    // 正規表現で配信元を取得
    let source = 'Yahoo!ニュース';
    const sourcePatterns = [
      /<div[^>]*data-ual-module=["']Source["'][^>]*>([^<]+)<\/div>/i,
      /<div[^>]*class="[^"]*source[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<span[^>]*class="[^"]*source[^"]*"[^>]*>([^<]+)<\/span>/i
    ];
    
    for (const pattern of sourcePatterns) {
      const match = html.match(pattern);
      if (match && match[1].trim()) {
        source = match[1].trim();
        break;
      }
    }
    
    // 要約作成
    const summary = content.length > 100 
      ? content.substring(0, 100) + '...'
      : content;
    
    const result: YahooArticleDetail = {
      title,
      content: content || '記事内容を取得できませんでした。',
      publishedAt,
      image: image || undefined,
      summary,
      url,
      source
    };
    
    console.log(`✅ Yahoo!記事スクレイピング完了:`, {
      title: title.substring(0, 30) + '...',
      contentLength: content.length,
      hasImage: !!image,
      source
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ Yahoo!記事スクレイピングエラー: ${url}`, error);
    // エラー時もフォールバック記事を返す
    return createFallbackArticle(url);
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
    
    // Yahoo!ニュースのURLかチェック
    if (!url.includes('news.yahoo.co.jp')) {
      return NextResponse.json({
        success: false,
        error: 'Yahoo!ニュースの記事URLのみサポートしています'
      }, { status: 400 });
    }
    
    console.log(`🔄 Yahoo!記事詳細取得開始: ${url}`);
    
    // try-catchで安全にスクレイピングを実行
    let articleDetail: YahooArticleDetail;
    try {
      articleDetail = await scrapeYahooArticle(url);
    } catch (scrapeError) {
      console.error('スクレイピングエラー:', scrapeError);
      // エラー時はフォールバック記事を返す
      articleDetail = createFallbackArticle(url);
    }
    
    console.log(`✅ Yahoo!記事詳細取得完了`);
    
    return NextResponse.json({
      success: true,
      article: articleDetail,
      fetchedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Yahoo!記事詳細取得エラー:', error);
    
    // 最終的なフォールバック
    const fallbackArticle = createFallbackArticle(request.nextUrl.searchParams.get('url') || '');
    
    return NextResponse.json({
      success: true,
      article: fallbackArticle,
      fetchedAt: new Date().toISOString()
    });
  }
}