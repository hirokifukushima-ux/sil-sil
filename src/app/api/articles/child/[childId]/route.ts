import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseError } from '@/lib/database';

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
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 1000; // limitが指定されていない場合は大きな値（実質制限なし）
    
    console.log(`📚 子供ID ${childId} の記事を取得中...`, { category, limit });
    
    // 新しいデータベース抽象化層から記事を取得
    const db = getDatabase();
    const articles = await db.getArticles({
      userId: childId,
      category: category || undefined,
      isArchived: false, // アーカイブされていない記事のみ
      limit
    });
    
    console.log(`✅ 記事取得完了: ${articles.length}件`);
    
    return NextResponse.json({
      success: true,
      articles: articles,
      total: articles.length,
      childId
    });
    
  } catch (error) {
    console.error('❌ 記事取得エラー:', error);
    
    // DatabaseErrorの特別処理
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { 
          error: `データベースエラー: ${error.message}`,
          code: error.code
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `記事の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}