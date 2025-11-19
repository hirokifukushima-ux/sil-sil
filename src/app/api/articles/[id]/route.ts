import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseError } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
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

    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      return NextResponse.json(
        { success: false, error: '無効な記事IDです' },
        { status: 400 }
      );
    }

    // 親アカウントIDを決定（子の場合は親のIDを使用）
    const parentId = session.userType === 'parent' ? session.userId : session.parentId;

    console.log(`📖 記事ID:${articleId}の詳細を取得中... (親: ${parentId})`);

    const db = getDatabase();
    const article = await db.getArticleById(articleId);

    if (!article) {
      return NextResponse.json(
        { success: false, error: '記事が見つかりません' },
        { status: 404 }
      );
    }

    // 記事が自分の親アカウントに属しているか確認
    if (article.parentId && article.parentId !== parentId) {
      return NextResponse.json(
        { success: false, error: 'この記事にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    console.log(`✅ 記事取得完了: ${article.convertedTitle}`);

    return NextResponse.json({
      success: true,
      article: article
    });
    
  } catch (error) {
    console.error('❌ 記事取得エラー:', error);
    
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { 
          success: false,
          error: `データベースエラー: ${error.message}`,
          code: error.code
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: `記事の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}