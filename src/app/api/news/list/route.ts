import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';


const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'thumbnail'],
      ['media:content', 'mediaContent'],
    ]
  }
});

export interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
  thumbnail?: string;
}

// Yahoo!ニュースのRSSフィード一覧
const YAHOO_RSS_FEEDS = {
  main: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',     // 主要
  domestic: 'https://news.yahoo.co.jp/rss/topics/domestic.xml', // 国内
  world: 'https://news.yahoo.co.jp/rss/topics/world.xml',       // 国際
  business: 'https://news.yahoo.co.jp/rss/topics/business.xml', // 経済
  entertainment: 'https://news.yahoo.co.jp/rss/topics/entertainment.xml', // エンタメ
  sports: 'https://news.yahoo.co.jp/rss/topics/sports.xml',     // スポーツ
  it: 'https://news.yahoo.co.jp/rss/topics/it.xml',             // IT
  science: 'https://news.yahoo.co.jp/rss/topics/science.xml',   // 科学
};

async function fetchRSSFeed(url: string, categoryName: string): Promise<NewsItem[]> {
  try {
    console.log(`📡 RSS取得開始: ${categoryName} - ${url}`);
    
    const feed = await parser.parseURL(url);
    
    const items: NewsItem[] = feed.items.map((item) => ({
      title: item.title || '',
      link: item.link || '',
      description: item.contentSnippet || item.description || '',
      pubDate: item.pubDate || new Date().toISOString(),
      category: categoryName,
      thumbnail: (item as { thumbnail?: { url?: string }; 'media:thumbnail'?: { url?: string } }).thumbnail?.url || (item as { thumbnail?: { url?: string }; 'media:thumbnail'?: { url?: string } })['media:thumbnail']?.url
    }));
    
    console.log(`✅ RSS取得完了: ${categoryName} - ${items.length}件`);
    return items;
  } catch (error) {
    console.error(`❌ RSS取得エラー: ${categoryName}`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'main';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    console.log(`🔄 ニュース一覧取得開始 - カテゴリ: ${category}, 制限: ${limit}`);
    
    let newsItems: NewsItem[] = [];
    
    if (category === 'all') {
      // 全カテゴリから取得
      const promises = Object.entries(YAHOO_RSS_FEEDS).map(([key, url]) => 
        fetchRSSFeed(url, getCategoryDisplayName(key))
      );
      
      const results = await Promise.allSettled(promises);
      newsItems = results
        .filter((result): result is PromiseFulfilledResult<NewsItem[]> => result.status === 'fulfilled')
        .flatMap(result => result.value);
        
    } else if (YAHOO_RSS_FEEDS[category as keyof typeof YAHOO_RSS_FEEDS]) {
      // 指定カテゴリから取得
      const url = YAHOO_RSS_FEEDS[category as keyof typeof YAHOO_RSS_FEEDS];
      newsItems = await fetchRSSFeed(url, getCategoryDisplayName(category));
    } else {
      return NextResponse.json({
        success: false,
        error: '無効なカテゴリです'
      }, { status: 400 });
    }
    
    // 公開日時順でソート
    newsItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    // 制限数に絞る
    const limitedItems = newsItems.slice(0, limit);
    
    console.log(`✅ ニュース一覧取得完了 - ${limitedItems.length}件返却`);
    
    return NextResponse.json({
      success: true,
      news: limitedItems,
      totalCount: limitedItems.length,
      category: category,
      fetchedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('ニュース一覧取得エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'ニュース一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getCategoryDisplayName(key: string): string {
  const categoryMap: { [key: string]: string } = {
    main: '主要',
    domestic: '国内',
    world: '国際',
    business: '経済',
    entertainment: 'エンタメ',
    sports: 'スポーツ',
    it: 'IT',
    science: '科学'
  };
  
  return categoryMap[key] || key;
}