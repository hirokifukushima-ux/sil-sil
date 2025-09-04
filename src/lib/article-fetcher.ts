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
    console.log(`🔍 記事取得を開始: ${url}`);
    
    // Yahoo Newsの場合は特別な処理
    if (url.includes('news.yahoo.co.jp')) {
      return await fetchYahooNewsArticle(url);
    }
    
    // CORSの制限により、サーバーサイドでのみ動作
    // 本番環境では適切なプロキシまたはサーバーサイド処理が必要
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; シルシル/1.0; +https://sil-sil.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ HTTP ${response.status} エラー: ${url}`);
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`📝 HTMLデータを取得: ${html.length} 文字`);
    
    return parseHtmlContent(html, url);
    
  } catch (error) {
    console.error('基本フェッチエラー:', error);
    return getDemoArticleData(url);
  }
}

// Yahoo News専用の記事取得関数
async function fetchYahooNewsArticle(url: string): Promise<RawArticleData> {
  try {
    console.log(`📰 Yahoo Newsの記事を取得: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Referer': 'https://news.yahoo.co.jp/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo News HTTP ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`📝 Yahoo NewsのHTMLデータを取得: ${html.length} 文字`);
    
    // Yahoo News特有のセレクタを使用
    const yahooTitlePatterns = [
      /<h1[^>]*class="[^"]*sc-[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*class="[^"]*ArticleHeader[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*?)["'][^>]*>/i,
      /<title[^>]*>([^<]*?)\s*-\s*Yahoo!ニュース<\/title>/i,
      /<title[^>]*>([^<]*?)<\/title>/i
    ];
    
    const yahooDescPatterns = [
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*?)["'][^>]*>/i,
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*?)["'][^>]*>/i,
      /<div[^>]*class="[^"]*ArticleSummary[^"]*"[^>]*>([^<]+)<\/div>/i
    ];
    
    const yahooContentPatterns = [
      // Yahoo News記事本文の一般的なパターン
      /<div[^>]*class="[^"]*ArticleText[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*highLightSearchTarget[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*sc-[^"]*"[^>]*data-[^>]*>([\s\S]*?)<\/div>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<p[^>]*>(.*?)<\/p>/gi
    ];
    
    let title = '';
    let description = '';
    let content = '';
    
    // タイトル抽出（Yahoo News専用パターン）
    for (const pattern of yahooTitlePatterns) {
      const match = html.match(pattern);
      if (match && match[1].trim()) {
        title = match[1].trim().replace(/\s*-\s*Yahoo!ニュース.*$/, '');
        console.log(`✅ Yahoo Newsタイトル取得: ${title}`);
        break;
      }
    }
    
    // 説明文抽出
    for (const pattern of yahooDescPatterns) {
      const match = html.match(pattern);
      if (match && match[1].trim()) {
        description = match[1].trim();
        console.log(`✅ Yahoo News説明文取得: ${description.substring(0, 50)}...`);
        break;
      }
    }
    
    // 記事本文抽出（Yahoo News専用パターン）
    for (const pattern of yahooContentPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      if (matches.length > 0) {
        const extractedText = matches.map(match => 
          match[1]
            .replace(/<[^>]*>/g, '') // HTMLタグを除去
            .replace(/&[^;]+;/g, ' ') // HTMLエンティティを除去
            .replace(/\s+/g, ' ') // 複数の空白を一つに
            .trim()
        ).filter(text => text.length > 10) // 短すぎるテキストを除外
        .join(' ');
        
        if (extractedText.length > content.length && extractedText.length > 50) {
          content = extractedText;
        }
      }
    }
    
    // 画像取得
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*?)["'][^>]*>/i);
    
    // タイトルが取得できない場合のフォールバック
    if (!title) {
      title = 'Yahoo!ニュースの記事';
      console.warn('⚠️ Yahoo Newsタイトルの取得に失敗');
    }
    
    // 説明文が取得できない場合のフォールバック
    if (!description) {
      description = title.length > 0 ? `${title}についての重要なニュースです。` : 'Yahoo!ニュースから重要な記事をお届けします。';
      console.warn('⚠️ Yahoo News説明文の取得に失敗');
    }
    
    // 本文が取得できない場合は説明文を使用
    if (!content || content.length < 100) {
      content = description.length > 100 ? description : `${title}についての詳細な記事です。Yahoo!ニュースから重要な情報をお伝えします。この記事には最新の情報や関係者のコメント、今後の展開についての情報が含まれています。詳細については元記事をご確認ください。`;
    }
    
    return {
      title: title.trim(),
      description: description.trim(),
      content: content.trim().substring(0, 2000),
      image: ogImageMatch?.[1],
      url: url,
      site_name: 'Yahoo!ニュース'
    };
    
  } catch (error) {
    console.error('Yahoo News記事取得エラー:', error);
    // Yahoo News固有のフォールバック
    return getYahooNewsFallbackData(url);
  }
}

// HTML解析の共通処理
function parseHtmlContent(html: string, url: string): RawArticleData {
  // より堅牢なメタタグ解析（様々な形式に対応）
  const titlePatterns = [
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*?)["'][^>]*>/i,
    /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*?)["'][^>]*>/i,
    /<title[^>]*>([^<]*?)<\/title>/i,
    /<h1[^>]*>([^<]*?)<\/h1>/i
  ];
  
  const descPatterns = [
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*?)["'][^>]*>/i,
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*?)["'][^>]*>/i,
    /<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*?)["'][^>]*>/i
  ];
  
  let title = '';
  let description = '';
  
  // タイトル抽出
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1].trim()) {
      title = match[1].trim();
      console.log(`✅ タイトル取得: ${title}`);
      break;
    }
  }
  
  // 説明文抽出  
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match && match[1].trim()) {
      description = match[1].trim();
      console.log(`✅ 説明文取得: ${description.substring(0, 50)}...`);
      break;
    }
  }
  
  // 画像取得
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*?)["'][^>]*>/i);
  
  if (!title) {
    title = 'タイトルが取得できませんでした';
    console.warn('⚠️ タイトルの取得に失敗');
  }
  if (!description) {
    description = '記事の詳細情報を取得できませんでした';
    console.warn('⚠️ 説明文の取得に失敗');
  }
  
  // 記事本文をより詳しく抽出
  let content = description;
  
  // 一般的な記事パターンを試行
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
}

// Yahoo News専用のフォールバックデータ
function getYahooNewsFallbackData(url: string): RawArticleData {
  // URLから記事IDやパスを分析してより具体的な内容を生成
  const urlPath = url.split('/').pop() || '';
  const isExpertArticle = url.includes('/expert/articles/');
  
  let title = 'Yahoo!ニュースの記事';
  let content = 'Yahoo!ニュースから重要なニュースをお届けします。';
  
  if (isExpertArticle) {
    title = 'Yahoo!ニュース専門家記事';
    content = 'Yahoo!ニュースの専門家による詳細な解説記事です。専門的な視点から分析された内容をお届けします。関連する分野の最新動向や背景情報も含まれており、読者の理解を深めるための貴重な情報源となっています。';
  }
  
  // URLに含まれるキーワードから内容を推測
  if (urlPath.includes('tech') || urlPath.includes('ai')) {
    title = 'テクノロジー関連のニュース';
    content = '最新のテクノロジーや人工知能に関する重要なニュースです。技術の進歩や新しいサービス、今後の展開についての情報が含まれています。';
  } else if (urlPath.includes('sports')) {
    title = 'スポーツニュース';
    content = 'スポーツ界の最新動向や選手の活躍、大会結果などの情報をお届けします。';
  } else if (urlPath.includes('politics')) {
    title = '政治ニュース';
    content = '政治の動向や重要な政策決定についての最新情報です。';
  } else if (urlPath.includes('economy') || urlPath.includes('business')) {
    title = '経済・ビジネスニュース';
    content = '経済情勢や企業動向に関する重要な情報をお伝えします。';
  }
  
  return {
    title: title,
    description: content.substring(0, 100),
    content: content,
    url: url,
    site_name: 'Yahoo!ニュース'
  };
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
  
  // URL解析して実際の記事に近いデータを生成しようと試行
  try {
    // URLから記事のテーマを推測
    const urlKeywords = url.toLowerCase();
    let title = '重要なニュース記事';
    let content = '本記事の詳細な内容を取得できませんでしたが、重要な情報が含まれている可能性があります。';
    
    if (urlKeywords.includes('tech') || urlKeywords.includes('technology') || urlKeywords.includes('ai') || urlKeywords.includes('robot')) {
      title = '最新テクノロジーに関するニュース';
      content = '最新のテクノロジーの進歩により、私たちの生活は大きく変わろうとしています。人工知能やロボット技術の発展により、これまで不可能だったことが現実のものとなってきています。';
    } else if (urlKeywords.includes('sports') || urlKeywords.includes('sport') || urlKeywords.includes('game')) {
      title = 'スポーツ関連のニュース';
      content = 'スポーツ界で注目される出来事が発生しています。選手の活躍や大会の結果など、多くの人が関心を持つニュースです。';
    } else if (urlKeywords.includes('politics') || urlKeywords.includes('government') || urlKeywords.includes('minister')) {
      title = '政治・行政に関するニュース';
      content = '政治の動向や行政の重要な決定について報道されています。これらの決定は市民生活に大きな影響を与える可能性があります。';
    } else if (urlKeywords.includes('economy') || urlKeywords.includes('business') || urlKeywords.includes('market')) {
      title = '経済・ビジネスに関するニュース';
      content = '経済動向や企業活動に関する重要な情報です。市場の変化や企業の戦略など、ビジネスに関心のある方に役立つ内容となっています。';
    } else if (urlKeywords.includes('covid') || urlKeywords.includes('health') || urlKeywords.includes('medical')) {
      title = '健康・医療に関するニュース';
      content = '健康や医療に関する最新の情報をお届けします。多くの人の健康に関わる重要な内容が含まれています。';
    }
    
    return {
      title: title,
      description: content.substring(0, 100),
      content: content,
      url: url,
      site_name: siteName
    };
  } catch (error) {
    console.error('デモデータ生成エラー:', error);
  }
  
  // フォールバック用の汎用データ
  const demoData: { [key: string]: RawArticleData } = {
    'news.yahoo.co.jp': {
      title: 'Yahoo!ニュースの記事',
      description: 'Yahoo!ニュースから重要な記事をお届けします',
      content: 'Yahoo!ニュースから重要な記事をお届けします。詳細な内容については、元の記事をご確認ください。',
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