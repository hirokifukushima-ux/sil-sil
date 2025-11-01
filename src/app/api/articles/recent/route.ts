import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseError } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 1000; // limitが指定されていない場合は大きな値（実質制限なし）
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    console.log(`📊 最近の記事を取得中... (limit: ${limit}, includeArchived: ${includeArchived})`);
    
    // 新しいデータベース抽象化層から記事を取得
    const db = getDatabase();
    const articles = await db.getArticles({
      isArchived: includeArchived ? undefined : false, // includeArchived=falseの場合のみアーカイブされていない記事を取得
      limit
    });
    
    // 統計情報も取得
    const stats = await db.getStats('child1'); // 現在は固定、実際は動的に取得
    
    console.log(`✅ 取得完了: ${articles.length}件の記事`);
    
    return NextResponse.json({
      success: true,
      articles: articles,
      stats: stats,
      total: articles.length
    });
    
  } catch (error) {
    console.error('❌ 最近の記事取得エラー:', error);
    
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