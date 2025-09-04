import { ArticleContent } from './openai';

export interface RawArticleData {
  title: string;
  description: string;
  content: string;
  image?: string;
  url: string;
  site_name?: string;
}

// LinkPreview API を使用して記事メタデータを取得
export async function fetchArticleMetadata(url: string): Promise<RawArticleData> {
  try {
    // LinkPreview API が利用可能な場合
    if (process.env.LINKPREVIEW_API_KEY) {
      console.log('LinkPreview APIで記事データを取得中...', url);
      
      const response = await fetch(`http://api.linkpreview.net/?key=${process.env.LINKPREVIEW_API_KEY}&q=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error(`LinkPreview API エラー: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        title: data.title || 'タイトルが取得できませんでした',
        description: data.description || '',
        content: data.description || 'コンテンツが取得できませんでした',
        image: data.image,
        url: data.url || url,
        site_name: data.site
      };
    }
    
    // APIキーがない場合、基本的なフェッチを試行
    console.log('基本的なフェッチで記事データを取得中...', url);
    return await basicFetchArticle(url);
    
  } catch (error) {
    console.error('記事メタデータ取得エラー:', error);
    // エラー時はデモデータを返す
    return getDemoArticleData(url);
  }
}

// 基本的なHTML解析（シンプルなフォールバック）
async function basicFetchArticle(url: string): Promise<RawArticleData> {
  try {
    // CORSの制限により、サーバーサイドでのみ動作
    // 本番環境では適切なプロキシまたはサーバーサイド処理が必要
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; シルシル/1.0; +https://sil-sil.vercel.app)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // 基本的なメタタグ解析
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
    
    const title = ogTitleMatch?.[1] || titleMatch?.[1] || 'タイトルが取得できませんでした';
    const description = ogDescMatch?.[1] || descMatch?.[1] || '';
    
    // 記事本文をより詳しく抽出
    let content = description;
    
    // Yahoo!ニュースなどの一般的な記事パターンを試行
    const articlePatterns = [
      // 段落タグ内のテキスト
      /<p[^>]*>(.*?)<\/p>/gi,
      // article タグ内のテキスト
      /<article[^>]*>(.*?)<\/article>/gi,
      // div class="article" のようなパターン
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>(.*?)<\/div>/gi,
      // main コンテンツ
      /<main[^>]*>(.*?)<\/main>/gi
    ];
    
    for (const pattern of articlePatterns) {
      const matches = Array.from(html.matchAll(pattern));
      if (matches.length > 0) {
        const extractedText = matches.map(match => 
          match[1]
            .replace(/<[^>]*>/g, '') // HTMLタグを除去
            .replace(/&[^;]+;/g, ' ') // HTMLエンティティを除去
            .replace(/\s+/g, ' ') // 複数の空白を一つに
            .trim()
        ).join(' ');
        
        if (extractedText.length > content.length) {
          content = extractedText;
          break;
        }
      }
    }
    
    // 最低でも300文字程度の内容を確保（デモ用の補完）
    if (content.length < 200) {
      content = `${description || title}についての詳細な記事です。この話題は多くの人々に影響を与える重要な内容となっています。最新の情報と共に、背景や今後の展開についても詳しく解説されています。関係者の声や専門家の意見も交え、多角的な視点から分析が行われています。読者にとって価値のある情報を提供することを目的として、分かりやすく整理された内容となっています。`;
    }
    
    return {
      title: title.trim(),
      description: description.trim(),
      content: content.trim().substring(0, 2000), // 最大2000文字に制限
      image: ogImageMatch?.[1],
      url: url,
      site_name: extractSiteName(url)
    };
    
  } catch (error) {
    console.error('基本フェッチエラー:', error);
    return getDemoArticleData(url);
  }
}

// サイト名を URL から抽出
function extractSiteName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown Site';
  }
}

// デモ用の記事データ生成
function getDemoArticleData(url: string): RawArticleData {
  const siteName = extractSiteName(url);
  
  // URL に基づいてデモデータを生成
  const demoData: { [key: string]: RawArticleData } = {
    'news.yahoo.co.jp': {
      title: '最新のテクノロジーニュース',
      description: '新しい技術の発展について詳しく解説します',
      content: '最新のテクノロジーの進歩により、私たちの生活は大きく変わろうとしています。人工知能やロボット技術の発展により、これまで不可能だったことが現実のものとなってきています。',
      url: url,
      site_name: 'Yahoo!ニュース'
    },
    'nhk.or.jp': {
      title: 'NHKニュース - 重要な出来事',
      description: '今日の重要なニュースをお伝えします',
      content: '本日発生した重要な出来事について、詳細にお伝えします。この出来事は多くの人々に影響を与える可能性があり、今後の動向に注目が集まっています。',
      url: url,
      site_name: 'NHK'
    }
  };
  
  // サイトに応じたデモデータを返すか、汎用データを生成
  for (const site in demoData) {
    if (url.includes(site)) {
      return demoData[site];
    }
  }
  
  // 汎用デモデータ
  return {
    title: 'インターネット上の興味深い記事',
    description: 'この記事には興味深い情報が含まれています',
    content: 'インターネット上には多くの情報があふれています。その中から重要で興味深い内容を選んで、分かりやすくお伝えします。',
    url: url,
    site_name: siteName
  };
}

// 記事データをAI変換用の形式に変換
export function convertToArticleContent(rawData: RawArticleData): ArticleContent {
  return {
    title: rawData.title,
    content: rawData.content,
    summary: rawData.description.substring(0, 100),
    category: inferCategory(rawData.title + ' ' + rawData.description)
  };
}

// タイトルと説明からカテゴリを推測
function inferCategory(text: string): string {
  const categories: { [key: string]: string[] } = {
    '科学': ['科学', '研究', '発見', '実験', '技術', 'AI', '宇宙', '医療'],
    'スポーツ': ['スポーツ', '野球', 'サッカー', 'オリンピック', '選手', '試合'],
    '政治': ['政治', '選挙', '政府', '法案', '首相', '大統領'],
    '経済': ['経済', '株価', '企業', 'ビジネス', '市場', '投資'],
    '文化': ['文化', '映画', '音楽', 'アート', '芸術', '文学'],
    '社会': ['社会', '事件', '災害', '教育', '環境', '交通']
  };
  
  for (const category in categories) {
    if (categories[category].some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return 'その他';
}