import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

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
      },
      timeout: 10000 // 10秒のタイムアウト
    } as any);
    
    if (!response.ok) {
      console.warn('pickup URLの取得に失敗、元URLを使用');
      return pickupUrl;
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // 実際の記事URLを探す
    const articleLinkSelectors = [
      'a[href*="news.yahoo.co.jp/articles/"]',
      'a[href*="/articles/"]',
      '.sc-cNKqjZ a',
      '.article-link',
      '[data-ual-module="Article"] a'
    ];
    
    for (const selector of articleLinkSelectors) {
      const linkElement = document.querySelector(selector);
      if (linkElement) {
        let href = linkElement.getAttribute('href');
        if (href) {
          if (href.startsWith('/')) {
            href = `https://news.yahoo.co.jp${href}`;
          }
          if (href.includes('/articles/')) {
            console.log(`✅ 実際の記事URL発見: ${href}`);
            return href;
          }
        }
      }
    }
    
    // 見つからない場合はリダイレクト先を試行
    const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
    if (metaRefresh) {
      const content = metaRefresh.getAttribute('content');
      const urlMatch = content?.match(/url=(.+)/);
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
    
    // JSDOMを安全に使用
    let document: Document;
    try {
      const dom = new JSDOM(html);
      document = dom.window.document;
    } catch (jsdomError) {
      console.error('JSDOM初期化エラー:', jsdomError);
      // フォールバック：基本的な正規表現でタイトルを抽出
      return createFallbackArticle(url, html);
    }
    
    // デバッグ：ページの主要な構造を確認
    console.log('🔍 Yahoo!ページ構造デバッグ:');
    const mainElements = [
      'article',
      '.article',
      '[data-ual-module="Article"]',
      '.sc-bxHsqm',
      '.highLight',
      'main'
    ];
    
    mainElements.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`  ✅ 発見: ${selector}`);
      }
    });
    
    // タイトル取得 - Yahoo!ニュースの構造に対応
    const titleSelectors = [
      'h1[data-ual-module="Headline"]',
      '.sc-bxHsqm h1',
      'article h1',
      '.article-header h1',
      'h1'
    ];
    
    let title = '';
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement?.textContent?.trim()) {
        title = titleElement.textContent.trim();
        console.log(`✅ タイトル取得成功: ${selector}`);
        break;
      }
    }
    
    if (!title) {
      title = document.title || 'タイトル不明';
    }
    
    // 本文取得 - Yahoo!ニュースの構造に対応
    const contentSelectors = [
      '.highLight p',                              // Yahoo!ニュースの記事本文（旧構造）
      '[data-ual-module="Article"] p',             // データ属性ベース
      '.sc-dmlJSK p',                             // 新しいスタイルコンポーネント
      '.sc-bxHsqm .sc-eCBpNj p',                  // スタイルコンポーネント
      '.article-body p',                           // 一般的な構造
      '.article-content p',
      '.content p',
      '.textBody p',
      'article div p',                             // より広範囲
      'main p'
    ];
    
    let contentElements: NodeListOf<Element> | null = null;
    let selectedSelector = '';
    
    for (const selector of contentSelectors) {
      contentElements = document.querySelectorAll(selector);
      if (contentElements.length > 0) {
        selectedSelector = selector;
        console.log(`✅ コンテンツ取得成功: ${selector} - ${contentElements.length}個の段落`);
        break;
      }
    }
    
    let content = '';
    if (contentElements && contentElements.length > 0) {
      const contentParts: string[] = [];
      contentElements.forEach((element, index) => {
        const text = element.textContent?.trim();
        if (text && 
            text.length > 15 &&                    // より短い文も含める
            !text.includes('シェア') && 
            !text.includes('ツイート') &&
            !text.includes('関連記事') &&
            !text.includes('続きを読む') &&
            !text.includes('Yahoo!ニュース個人') &&  // 固有名詞を除く
            !text.includes('※この記事は') &&
            !text.includes('写真:') &&
            !text.includes('画像:') &&
            (text.includes('。') || text.includes('、') || text.length > 50) &&  // 日本語の文章判定を緩和
            !text.match(/^[a-zA-Z\s\.\(\)]+$/)) {  // 英語のみを除外
          contentParts.push(text);
          if (index < 5) {
            console.log(`📝 段落${index + 1}: ${text.substring(0, 50)}...`);
          }
        }
      });
      content = contentParts.join('\n\n');
      console.log(`📄 最終コンテンツ長: ${content.length}文字, 段落数: ${contentParts.length}`);
    }
    
    // コンテンツが取得できない場合の代替処理
    if (!content || content.length < 100) {
      console.log('⚠️ Yahoo!記事本文取得失敗、代替方法を試行');
      
      // より広範囲な取得を試行
      const allParagraphs = document.querySelectorAll('p');
      const fallbackContent: string[] = [];
      
      allParagraphs.forEach(p => {
        const text = p.textContent?.trim();
        if (text && 
            text.length > 30 &&
            text.includes('。') &&
            !text.includes('シェア') &&
            !text.includes('ツイート') &&
            !text.includes('Yahoo!') &&
            !text.includes('配信')) {
          fallbackContent.push(text);
        }
      });
      
      content = fallbackContent.slice(0, 10).join('\n\n');
      console.log(`📄 代替コンテンツ長: ${content.length}文字`);
    }
    
    // 画像取得 - 記事内容に関連する画像を優先的に選択
    const imageSelectors = [
      'article img',
      '.article img', 
      '.highLight img',
      '[data-ual-module="Article"] img',
      '.article-body img',
      '.content img',
      'main img'
    ];
    
    let image = '';
    let bestImage = '';
    
    // 全ての画像をチェックして最適なものを選択
    for (const selector of imageSelectors) {
      const imgElements = document.querySelectorAll(selector);
      
      for (const imgElement of imgElements) {
        const src = imgElement.getAttribute('src');
        if (!src) continue;
        
        let fullSrc = src;
        if (!fullSrc.startsWith('http')) {
          fullSrc = `https:${fullSrc}`;
        }
        
        // 媒体ロゴや小さい画像を除外
        const alt = imgElement.getAttribute('alt') || '';
        const width = imgElement.getAttribute('width') || imgElement.style.width || '';
        const height = imgElement.getAttribute('height') || imgElement.style.height || '';
        
        // 除外条件を強化
        const isLogo = (
          fullSrc.includes('logo') ||
          fullSrc.includes('icon') ||
          fullSrc.includes('favicon') ||
          alt.toLowerCase().includes('logo') ||
          alt.toLowerCase().includes('icon') ||
          fullSrc.includes('avatar') ||
          fullSrc.includes('profile') ||
          // 媒体名を含む画像URLを除外
          fullSrc.includes('afp') ||
          fullSrc.includes('sankei') ||
          fullSrc.includes('asahi') ||
          fullSrc.includes('mainichi') ||
          fullSrc.includes('yomiuri') ||
          fullSrc.includes('nikkei') ||
          fullSrc.includes('kyodo') ||
          fullSrc.includes('jiji') ||
          fullSrc.includes('reuters') ||
          fullSrc.includes('cnn') ||
          fullSrc.includes('bloomberg') ||
          // ファイル名パターンで除外
          fullSrc.match(/\/(logo|icon|favicon|brand|corp|company|media)[\w\-]*\.(jpg|jpeg|png|gif|svg)/i) ||
          // 固定サイズの小さい画像（大抵ロゴ）
          fullSrc.includes('150x') ||
          fullSrc.includes('200x') ||
          fullSrc.includes('100x') ||
          fullSrc.includes('50x')
        );
        
        const isSmall = (
          (width && parseInt(width) < 150) ||
          (height && parseInt(height) < 150)
        );
        
        // 広告やSNS関連の画像を除外
        const isAd = (
          fullSrc.includes('ad') ||
          fullSrc.includes('banner') ||
          fullSrc.includes('promo') ||
          fullSrc.includes('sns') ||
          fullSrc.includes('social') ||
          fullSrc.includes('twitter') ||
          fullSrc.includes('facebook') ||
          fullSrc.includes('youtube') ||
          fullSrc.includes('instagram') ||
          fullSrc.includes('tiktok')
        );
        
        // Yahoo!固有の除外パターン
        const isYahooSystem = (
          fullSrc.includes('y.yimg.jp') && (
            fullSrc.includes('/default/') ||
            fullSrc.includes('/common/') ||
            fullSrc.includes('/ui/') ||
            fullSrc.includes('/logo/') ||
            fullSrc.includes('/icon/')
          )
        );
        
        if (!isLogo && !isSmall && !isAd && !isYahooSystem) {
          // 最初に見つかった適切な画像を使用
          if (!bestImage) {
            bestImage = fullSrc;
            console.log(`✅ 記事画像を選択: ${fullSrc.substring(0, 80)}...`);
            break;
          }
        } else {
          const reason = isLogo ? 'ロゴ/媒体' : isSmall ? '小さすぎる' : isAd ? 'ソーシャル/広告' : 'Yahooシステム';
          console.log(`⚠️ 画像をスキップ: ${fullSrc.substring(0, 50)}... (理由: ${reason})`);
        }
      }
      
      if (bestImage) break;
    }
    
    image = bestImage;
    
    // 公開日時取得
    const timeSelectors = [
      'time',
      '[data-ual-module="Time"]',
      '.article-time',
      '.sc-time'
    ];
    
    let publishedAt = new Date().toISOString();
    for (const selector of timeSelectors) {
      const timeElement = document.querySelector(selector);
      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime') || timeElement.textContent?.trim();
        if (datetime) {
          publishedAt = datetime;
          break;
        }
      }
    }
    
    // 配信元取得
    const sourceElement = document.querySelector('[data-ual-module="Source"]') ||
                         document.querySelector('.source') ||
                         document.querySelector('.article-source');
    const source = sourceElement?.textContent?.trim() || 'Yahoo!ニュース';
    
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
    
    const articleDetail = await scrapeYahooArticle(url);
    
    console.log(`✅ Yahoo!記事詳細取得完了`);
    
    return NextResponse.json({
      success: true,
      article: articleDetail,
      fetchedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Yahoo!記事詳細取得エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Yahoo!記事の詳細取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}