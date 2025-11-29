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

// pickup URLからarticles URLを取得する関数
async function getArticleUrlFromPickup(pickupUrl: string): Promise<string> {
  try {
    const response = await fetch(pickupUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // pickupページから実際の記事URLを抽出
    const articleUrlPatterns = [
      /href="(https:\/\/news\.yahoo\.co\.jp\/articles\/[^"]+)"/,
      /data-href="(https:\/\/news\.yahoo\.co\.jp\/articles\/[^"]+)"/,
      /"url":\s*"(https:\/\/news\.yahoo\.co\.jp\/articles\/[^"]+)"/
    ];
    
    for (const pattern of articleUrlPatterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    // マッチしない場合は元のURLを返す
    return pickupUrl;
    
  } catch (error) {
    console.error('pickup URL変換エラー:', error);
    return pickupUrl;
  }
}

// 記事詳細を取得する関数（HTMLスクレイピング）
async function fetchArticleDetail(url: string): Promise<ArticleDetail> {
  try {
    // pickup URLの場合は実際のarticles URLに変換
    let actualUrl = url;
    if (url.includes('/pickup/')) {
      console.log(`🔄 pickup URL検出、articles URLに変換中: ${url}`);
      actualUrl = await getArticleUrlFromPickup(url);
      console.log(`✅ articles URL取得: ${actualUrl}`);
    }
    
    const response = await fetch(actualUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Yahoo!ニュース専用のタイトル抽出（複数パターンを順次試行）
    let title = 'ニュース記事';
    const yahooTitlePatterns = [
      // Yahoo!ニュースのメインタイトル（より具体的なパターン）
      /<h1[^>]*class="[^"]*sc-[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*class="[^"]*articleHeader_title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*class="[^"]*mainTitle[^"]*"[^>]*>([^<]+)<\/h1>/i,
      // OGタイトル（但し、Yahoo!ニュース固有の部分を除去）
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      // 一般的なタイトルタグ
      /<title[^>]*>([^<]+)<\/title>/i,
      // その他のh1要素
      /<h1[^>]*>([^<]+)<\/h1>/i
    ];

    for (const pattern of yahooTitlePatterns) {
      const match = html.match(pattern);
      if (match) {
        const extractedTitle = match[1]
          .replace(/\s*-\s*Yahoo!ニュース.*$/, '')
          .replace(/\s*\|\s*Yahoo!ニュース.*$/, '')
          .replace(/\s*\(\s*Yahoo!ニュース\s*\).*$/, '')
          .replace(/\s*\(\s*毎日新聞\s*\).*$/, '')
          .replace(/\s*\(\s*[^)]+\s*\)$/, '') // 末尾の括弧内メディア名を除去
          .trim();
        
        if (extractedTitle.length > 10) {
          title = extractedTitle;
          break;
        }
      }
    }


    // Yahoo!ニュース専用の本文抽出
    let content = '';
    const yahooContentPatterns = [
      // Yahoo!ニュースの記事本文パターン（優先順位順）
      // 1. Yahoo Expert記事用
      /<section[^>]*class="[^"]*sc-om2dh8[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
      // 2. 一般Yahoo News記事用（記事本文の p タグ）
      /<p[^>]*class="[^"]*sc-54nboa-0[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
      // 3. 記事本文コンテナ
      /<div[^>]*class="[^"]*article_body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // 4. その他のYahooパターン
      /<div[^>]*class="[^"]*sc-[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*news_body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*data-module="[^"]*ArticleBody[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // 5. 一般的なパターン
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i
    ];

    for (const pattern of yahooContentPatterns) {
      // sc-54nboa-0クラスの場合は全ての該当要素を取得
      if (pattern.source.includes('sc-54nboa-0')) {
        const matches = html.match(/<p[^>]*class="[^"]*sc-54nboa-0[^"]*"[^>]*>([\s\S]*)<\/p>/gi);
        if (matches && matches.length > 0) {
          const rawContent = matches.map(match => {
            const contentMatch = match.match(/<p[^>]*class="[^"]*sc-54nboa-0[^"]*"[^>]*>([\s\S]*)<\/p>/i);
            return contentMatch ? contentMatch[1] : '';
          }).join('\n\n');
          
          // 共通の清理処理を適用
          content = processContent(rawContent);
          if (content.length > 200) break;
        }
      } else {
        // 通常のパターン処理
        const match = html.match(pattern);
        if (match) {
          const rawContent = match[1];
          content = processContent(rawContent);
          if (content.length > 200) break;
        }
      }
    }

    // コンテンツ処理関数
    function processContent(rawContent: string): string {
      return rawContent
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[\s\S]*?<\/aside>/gi, '')
        .replace(/<div[^>]*class="[^"]*ad[^"]*"[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*sns[^"]*"[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*share[^"]*"[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*comment[^"]*"[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*related[^"]*"[\s\S]*?<\/div>/gi, '')
        // 小見出しの処理（太字で表示）
        .replace(/<h([1-6])[^>]*>([^<]+)<\/h\1>/gi, '\n\n**$2**\n\n')
        .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>([^<]+)<\/b>/gi, '**$1**')
        // 引用コメントの処理（Yahoo Expert専用）
        .replace(/<figure[^>]*data-role="quote"[^>]*>([\s\S]*?)<\/figure>/gi, (match, content) => {
          // blockquote内のpタグとbタグを処理
          let quoteContent = content
            .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '$1')
            .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1')
            .replace(/<b[^>]*data-role="bring-attention"[^>]*>([\s\S]*?)<\/b>/gi, '$1')
            .replace(/<\/br>|<br[^>]*\/?>/gi, '\n')
            .replace(/<a[^>]*href="[^"]*"[^>]*target="_blank"[^>]*>([^<]+)<\/a>/gi, '$1')
            .replace(/<[^>]+>/g, '') // 残りのHTMLタグを除去
            .trim();
          
          // 改行を適切に処理
          quoteContent = quoteContent.replace(/\n+/g, '\n').replace(/\n出典：/g, '\n\n出典：');
          
          return `\n\n> ${quoteContent}\n\n`;
        })
        // 段落構造を保持するHTMLタグ処理
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/div>/gi, '\n')
        .replace(/<div[^>]*>/gi, '')
        .replace(/<br[^>]*>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<ul[^>]*>/gi, '')
        // 残りのHTMLタグを除去
        .replace(/<[^>]+>/g, '')
        // HTML entities をデコード
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#8203;/g, '') // ゼロ幅スペース
        .replace(/&#x200B;/g, '') // ゼロ幅スペース
        // 空白文字の整理（改行は保持）
        .replace(/[ \t]+/g, ' ') // スペースとタブは1つに
        .replace(/\n[ \t]+/g, '\n') // 行頭の空白を除去
        .replace(/[ \t]+\n/g, '\n') // 行末の空白を除去
        .replace(/\n{3,}/g, '\n\n') // 3つ以上の連続改行は2つに
        .trim();
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

    // 不要な文言・セクションを除去
    if (content) {
      const lines = content.split('\n');
      const filteredLines = [];
      let skipSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 不要なセクションの開始を検出
        if (line.includes('ココがポイント') || 
            line.includes('記事全文を読む') ||
            line.includes('関連記事') ||
            line.includes('【関連記事】') ||
            line.includes('出典：') ||
            line.includes('iPhone Air、登場') ||
            line.includes('| Apple') ||
            line.includes('プライバシーポリシー') ||
            line.includes('Copyright') ||
            line.includes('無断転載を禁じます') ||
            line.includes('RSS') ||
            line.includes('ニュース提供社') ||
            line.includes('運営方針') ||
            line.includes('利用規約') ||
            line.includes('みんなの意見') ||
            line.includes('ランキング') ||
            line.includes('有料') ||
            line.includes('トップ') ||
            line.includes('速報') ||
            line.includes('ライブ') ||
            line.includes('Facebook') ||
            line.includes('X（旧Twitter）') ||
            line.includes('Yahoo!ニュース') && line.includes('オウンドメディア') ||
            line.includes('news HACK') ||
            line.includes('共同企画') ||
            line.includes('独自制作コンテンツ') ||
            line.includes('▼') ||
            line.includes('アプリデータ先読み') ||
            line.includes('オリジナル') ||
            line.includes('でしか出会えない') ||
            line.match(/^\d+[\s　]*突っ込んだ車/) ||
            line.match(/^\d+[\s　]*【/) ||
            line.match(/^[\s　]*[•·\-\*]\s*(トップ|速報|ライブ|みんなの意見|Facebook|X|news|▼)[\s　]/) ||
            line.match(/^[^\d]*\d{1,2}\/\d{1,2}.*\d{1,2}:\d{1,2}$/) ||
            line.match(/^[\d,]+コメント/) ||
            line.match(/^\d+件$/) ||
            line.includes('コメント') && line.includes('件') ||
            line.match(/毎日新聞\d+.*コメント\d+件/) ||
            line.match(/^[\d,]+.*コメント[\d,]+件$/)) {
          skipSection = true;
          continue;
        }
        
        // セクション終了の検出（空行や新しい段落）
        if (skipSection && (line === '' || line.match(/^[　\s]*$/))) {
          skipSection = false;
          continue;
        }
        
        // スキップ中でない場合は行を保持
        if (!skipSection) {
          // 小見出しの特別処理
          if (line.includes('エキスパートの補足・見解') || 
              line.includes('専門家の見解') ||
              line.includes('解説') ||
              line.match(/^【[^】]+】$/)) {
            filteredLines.push(`**${line}**`);
          } else if (line.length > 0) {
            filteredLines.push(line);
          } else {
            filteredLines.push(''); // 空行も保持
          }
        }
      }
      
      content = filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      
      // 記事本文と関連記事・ナビゲーションの境界をより厳密に特定
      const contentLines = content.split('\n');
      const cleanLines = [];
      let foundBulletPattern = false;
      
      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i].trim();
        
        // 関連記事やランキングの開始パターンを検出
        if (line.startsWith('•')) {
          // 通常の記事本文では • で始まる行は稀なので、停止
          foundBulletPattern = true;
          break;
        }
        
        // メディア名のパターンも検出
        if (line.match(/^[^\s]+ニュース$/) && 
            i < contentLines.length - 1 && 
            contentLines[i + 1].trim().startsWith('•')) {
          break;
        }
        
        // 空行は保持するが、箇条書き開始後は停止
        if (line || !foundBulletPattern) {
          cleanLines.push(contentLines[i]);
        }
      }
      
      content = cleanLines.join('\n').trim();
    }

    // Yahoo Expert記事の場合、h1タグから正確なタイトルを抽出
    if (url.includes('news.yahoo.co.jp/expert/')) {
      const h1Pattern = /<h1[^>]*class="[^"]*sc-1fea4ol-1[^"]*"[^>]*>([^<]+(?:<a[^>]*>[^<]*<\/a>)*[^<]*)<\/h1>/i;
      const h1Match = html.match(h1Pattern);
      if (h1Match) {
        // aタグを除去してクリーンなタイトルを取得
        const cleanTitle = h1Match[1].replace(/<a[^>]*>.*?<\/a>/g, '').trim();
        if (cleanTitle.length > 10) {
          title = cleanTitle;
        }
      }
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
      url: actualUrl,
      source: actualUrl.includes('yahoo.co.jp') ? 'Yahoo!ニュース' : 'ニュースサイト'
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