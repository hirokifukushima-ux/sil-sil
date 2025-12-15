import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseError } from '@/lib/database';
import { getAuthSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    // 認証情報を取得
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
    const limit = limitParam ? parseInt(limitParam) : 1000;

    // 親アカウントIDを決定（子の場合は親のIDを使用）
    const parentId = session.userType === 'parent' ? session.userId : session.parentId;

    console.log(`📚 子供ID ${childId} の記事を取得中... (親: ${parentId})`, { category, limit });

    // データベース取得
    const db = getDatabase();

    // この子どもの年齢を取得（後方互換性用）
    const childUser = await db.getUser(childId);
    const childAge = childUser?.childAge;

    // 親アカウント毎にフィルタリングして記事を取得
    const articles = await db.getArticles({
      parentId: parentId, // 親アカウントでフィルタリング
      childId: childId, // 子どもIDでフィルタリング（優先・個別管理用）
      category: category || undefined,
      isArchived: false,
      limit
    });

    // 後方互換性: child_id=NULLの記事をchildAgeでフィルタリング
    const filteredArticles = articles.filter(article => {
      // child_idが設定されている場合は既にフィルタリング済み
      if (article.childId) return true;

      // child_id=NULLの場合は年齢でマッチング
      if (!article.childId && childAge !== undefined) {
        return article.childAge === childAge;
      }

      // それ以外は除外
      return false;
    });
    
    console.log(`✅ 記事取得完了: ${filteredArticles.length}件（フィルタリング前: ${articles.length}件）`);

    return NextResponse.json({
      success: true,
      articles: filteredArticles,
      total: filteredArticles.length,
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