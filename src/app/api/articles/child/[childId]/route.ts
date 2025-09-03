import { NextRequest, NextResponse } from 'next/server';
import { getArticlesByChild } from '@/lib/article-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;
    
    if (!childId) {
      return NextResponse.json(
        { error: '子供IDが必要です' },
        { status: 400 }
      );
    }
    
    // URLパラメータから年齢やカテゴリでフィルタリング
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    console.log(`📚 子供ID ${childId} の記事を取得中...`, { category, limit });
    
    // インメモリストアから記事を取得
    const articles = getArticlesByChild(childId, category || undefined, limit);
    
    console.log(`✅ 記事取得完了: ${articles.length}件`);
    
    return NextResponse.json({
      success: true,
      articles: articles,
      total: articles.length,
      childId
    });
    
  } catch (error) {
    console.error('❌ 記事取得エラー:', error);
    return NextResponse.json(
      { error: `記事の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}