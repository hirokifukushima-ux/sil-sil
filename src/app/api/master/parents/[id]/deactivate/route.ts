import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: 認証チェック（マスターユーザーのみ）
    
    const { id } = await params;
    
    const db = getDatabase();
    
    // 親アカウントを無効化
    const updatedParent = await db.updateUser(id, { isActive: false });
    
    if (!updatedParent) {
      return NextResponse.json({
        success: false,
        error: '親アカウントが見つかりません'
      }, { status: 404 });
    }
    
    // 関連する子アカウントも無効化
    const children = await db.getUsers({ parentId: id });
    await Promise.all(
      children.map(child => db.updateUser(child.id, { isActive: false }))
    );
    
    console.log(`🚫 親アカウント無効化: ${id} (子アカウント${children.length}件も無効化)`);
    
    return NextResponse.json({
      success: true,
      message: `親アカウントと関連する子アカウント${children.length}件を無効化しました`
    });
    
  } catch (error) {
    console.error('親アカウント無効化エラー:', error);
    return NextResponse.json({
      success: false,
      error: '親アカウントの無効化中にエラーが発生しました'
    }, { status: 500 });
  }
}