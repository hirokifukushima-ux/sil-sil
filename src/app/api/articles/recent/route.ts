import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseError } from '@/lib/database';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック - ヘッダーからセッション情報を取得
    const authHeader = request.headers.get('authorization') || request.headers.get('x-auth-session');
    
    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: '認証情報が必要です'
      }, { status: 401 });
    }
    
    let session;
    try {
      session = JSON.parse(authHeader);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: '認証情報が無効です'
      }, { status: 401 });
    }
    
    if (!session || (session.userType !== 'parent' && session.userType !== 'child')) {
      return NextResponse.json({
        success: false,
        error: '記事閲覧は親アカウントまたは子アカウントでのみ利用できます'
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    // パフォーマンス最適化: デフォルト値を1000から50に変更
    const limit = limitParam ? parseInt(limitParam) : 50;
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    // 親アカウントIDを決定（子の場合は親のIDを使用）
    const parentId = session.userType === 'parent' ? session.userId : session.parentId;
    
    console.log(`📊 最近の記事を取得中... (親: ${parentId}, limit: ${limit}, includeArchived: ${includeArchived})`);
    
    // 親アカウント毎にフィルタリングして記事を取得
    const db = getDatabase();
    const articles = await db.getArticles({
      parentId: parentId, // 親アカウントでフィルタリング
      isArchived: includeArchived ? undefined : false,
      limit
    });
    
    // 統計情報も親アカウント毎に取得
    const stats = await db.getStats({ 
      parentId: parentId 
    });
    
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