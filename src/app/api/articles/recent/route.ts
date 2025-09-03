import { NextRequest, NextResponse } from 'next/server';
import { getRecentArticles, getStats } from '@/lib/article-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    console.log(`📊 最近の記事を取得中... (limit: ${limit}, includeArchived: ${includeArchived})`);
    
    // 最近の記事を取得
    const articles = getRecentArticles(limit, includeArchived);
    
    // 統計情報も取得
    const stats = getStats('child1'); // 現在は固定、実際は動的に取得
    
    console.log(`✅ 取得完了: ${articles.length}件の記事`);
    
    return NextResponse.json({
      success: true,
      articles: articles,
      stats: stats,
      total: articles.length
    });
    
  } catch (error) {
    console.error('❌ 最近の記事取得エラー:', error);
    return NextResponse.json(
      { error: `記事の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}