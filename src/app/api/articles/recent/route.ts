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
    const childAgeParam = searchParams.get('childAge');
    // パフォーマンス最適化: デフォルト値を1000から50に変更
    const limit = limitParam ? parseInt(limitParam) : 50;
    const childAge = childAgeParam ? parseInt(childAgeParam) : undefined;
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // 親アカウントIDを決定（子の場合は親のIDを使用）
    const parentId = session.userType === 'parent' ? session.userId : session.parentId;
    
    console.log(`📊 最近の記事を取得中... (親: ${parentId}, childAge: ${childAge || 'all'}, limit: ${limit}, includeArchived: ${includeArchived})`);

    // パフォーマンス最適化: 記事取得と統計取得を並列実行
    const db = getDatabase();
    const [articles, stats] = await Promise.all([
      db.getArticles({
        parentId: parentId, // 親アカウントでフィルタリング
        childAge: childAge, // 子どもの年齢でフィルタリング（オプション）
        isArchived: includeArchived ? undefined : false,
        limit
      }),
      db.getStats({
        parentId: parentId
      })
    ]);

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