import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // TODO: 親ユーザーの認証チェック
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    if (!parentId) {
      return NextResponse.json({
        success: false,
        error: '親IDが必要です'
      }, { status: 400 });
    }

    const db = getDatabase();

    // この親が送信した招待一覧を取得
    const invitations = await db.getInvitations({
      inviterId: parentId,
      inviterType: 'parent'
    });
    
    return NextResponse.json({
      success: true,
      invitations: invitations
    });
    
  } catch (error) {
    console.error('招待一覧取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: '招待一覧の取得中にエラーが発生しました'
    }, { status: 500 });
  }
}