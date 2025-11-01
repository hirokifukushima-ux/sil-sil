import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

export interface ArticleDetail {
  title: string;
  content: string;
  publishedAt: string;
  image?: string;
  summary: string;
  url: string;
}

async function scrapeNHKArticle(url: string): Promise<ArticleDetail> {
  try {
    console.log(`🔄 NHK記事スクレイピング開始: ${url}`);
    
    // フェッチ
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // デバッグ：ページの主要な構造を確認
    console.log('🔍 ページ構造デバッグ:');
    const mainElements = [
      'article',
      '.article-main', 
      '.content-main',
      '.module--detail-content',
      '.detail-content',
      'main',
      '.content-body',
      '.article-body'
    ];
    
    mainElements.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`  ✅ 発見: ${selector}`);
        // 子要素も確認
        const children = element.children;
        console.log(`    子要素: ${children.length}個`);
        for (let i = 0; i < Math.min(children.length, 5); i++) {
          console.log(`      - ${children[i].tagName}.${children[i].className}`);
        }
      }
    });
    
    // タイトル取得
    const titleElement = document.querySelector('h1.content-title') || 
                        document.querySelector('h1.article-title') ||
                        document.querySelector('h1') ||
                        document.querySelector('.article-header h1') ||
                        document.querySelector('title');
    const title = titleElement?.textContent?.trim() || 'タイトル不明';
    
    // 本文取得 - NHKの新しい構造に対応
    const contentSelectors = [
      'article div[class*="esl7kn2s"] p',  // NHKの新構造に対応
      'article div p',                     // より広範囲
      '[class*="content"] p',              // コンテンツ系クラス
      '[class*="body"] p',                 // ボディ系クラス
      '[class*="text"] p',                 // テキスト系クラス
      '.content-body .body-text p',        // 従来構造
      '.article-body .body-text p',
      '.body-text p',
      'main p',                            // より広範囲
      'article p'                          // 最も広範囲
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
            text.length > 30 &&                    // より長い文章のみ（記事本文らしく）
            !text.includes('シェア') && 
            !text.includes('ツイート') &&
            !text.includes('関連記事') &&
            !text.includes('続きを読む') &&
            !text.includes('JavaScript') &&       // JSコード除外
            !text.includes('const ') &&           // JSコード除外
            !text.includes('function') &&         // JSコード除外
            !text.includes('document.') &&        // JSコード除外
            !text.includes('window.') &&          // JSコード除外
            !text.includes('mediaQuery') &&       // JSコード除外
            !text.includes('classList') &&        // JSコード除外
            !text.includes('addEventListener') &&  // JSコード除外
            !text.match(/^\d+月\d+日/) &&
            !text.match(/^[「【].*[」】]$/) &&     // タイトル形式を除外
            text.includes('。') &&                 // 日本語の文章らしさ
            !text.match(/^[a-zA-Z\s\.\(\)]+$/)) {  // 英語のみの行を除外
          contentParts.push(text);
          if (index < 5) {
            console.log(`📝 段落${index + 1}: ${text.substring(0, 50)}...`);
          }
        }
      });
      content = contentParts.join('\n\n');
      console.log(`📄 最終コンテンツ長: ${content.length}文字, 段落数: ${contentParts.length}`);
    }
    
    // コンテンツが取得できない場合は、より広範囲で取得
    if (!content || content.length < 50) {
      console.log('⚠️ 詳細コンテンツ取得失敗、代替方法を試行');
      const bodyText = document.body?.textContent || '';
      const lines = bodyText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 20 && 
          !line.includes('シェア') && 
          !line.includes('ツイート') &&
          !line.includes('JavaScript') &&
          !line.includes('cookie'))
        .slice(0, 10); // 最初の10行程度
      content = lines.join('\n\n');
    }
    
    // 画像取得
    const imageElement = document.querySelector('img[src*="nhk.or.jp"]') ||
                        document.querySelector('.article-main img') ||
                        document.querySelector('.content-main img') ||
                        document.querySelector('article img');
    let image = imageElement?.getAttribute('src') || '';
    if (image && !image.startsWith('http')) {
      image = `https://www3.nhk.or.jp${image}`;
    }
    
    // 公開日時取得
    const timeElement = document.querySelector('time') ||
                       document.querySelector('.date') ||
                       document.querySelector('.published');
    const publishedAt = timeElement?.getAttribute('datetime') || 
                       timeElement?.textContent?.trim() || 
                       new Date().toISOString();
    
    // 要約作成（最初の段落または150文字）
    const summary = content.length > 150 
      ? content.substring(0, 150) + '...'
      : content;
    
    const result: ArticleDetail = {
      title,
      content: content || '記事内容を取得できませんでした。',
      publishedAt,
      image: image || undefined,
      summary,
      url
    };
    
    console.log(`✅ NHK記事スクレイピング完了:`, {
      title: title.substring(0, 30) + '...',
      contentLength: content.length,
      hasImage: !!image
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ NHK記事スクレイピングエラー: ${url}`, error);
    throw error;
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
    
    // NHKのURLかチェック
    if (!url.includes('nhk.or.jp')) {
      return NextResponse.json({
        success: false,
        error: 'NHKの記事URLのみサポートしています'
      }, { status: 400 });
    }
    
    console.log(`🔄 記事詳細取得開始: ${url}`);
    
    const articleDetail = await scrapeNHKArticle(url);
    
    console.log(`✅ 記事詳細取得完了`);
    
    return NextResponse.json({
      success: true,
      article: articleDetail,
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