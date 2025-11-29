import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// 子アカウント情報取得（子アカウント自身がアクセス可能）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({
        success: false,
        error: 'childIdが必要です'
      }, { status: 400 });
    }

    const db = getDatabase();
    const child = await db.getUser(childId);

    if (!child) {
      return NextResponse.json({
        success: false,
        error: '子アカウントが見つかりません'
      }, { status: 404 });
    }

    if (child.userType !== 'child') {
      return NextResponse.json({
        success: false,
        error: '指定されたIDは子アカウントではありません'
      }, { status: 400 });
    }

    // 子アカウントの基本情報のみを返す（セキュアな情報は除外）
    return NextResponse.json({
      success: true,
      profile: {
        id: child.id,
        displayName: child.displayName,
        childAge: child.childAge,
        parentId: child.parentId
      }
    });

  } catch (error) {
    console.error('子アカウント情報取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: '子アカウント情報の取得中にエラーが発生しました'
    }, { status: 500 });
  }
}
