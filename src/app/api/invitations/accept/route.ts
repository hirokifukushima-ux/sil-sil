import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { code, email, displayName } = await request.json();
    
    if (!code) {
      return NextResponse.json({
        success: false,
        error: '招待コードが必要です'
      }, { status: 400 });
    }
    
    const db = getDatabase();
    
    // 招待コードの確認
    const invitation = await db.getInvitation(code);
    
    if (!invitation) {
      return NextResponse.json({
        success: false,
        error: '招待コードが見つかりません'
      }, { status: 404 });
    }
    
    // 招待コードは何度でも使用可能（期限・使用済みチェックなし）
    // status チェックと期限チェックを削除
    
    // ユーザーアカウントの作成
    const userId = `user-${Date.now()}`;
    
    const newUser = await db.createUser({
      id: userId,
      email: email || invitation.email,
      displayName: displayName || `New ${invitation.targetType}`,
      userType: invitation.targetType,
      parentId: invitation.parentId,
      masterId: invitation.inviterId === 'master-1' ? invitation.inviterId : undefined,
      organizationId: invitation.organizationId,
      isActive: true,
      createdBy: invitation.inviterId
    });
    
    // 招待コードは永続的に使用可能なため、statusは変更しない
    // await db.acceptInvitation(code, userId); // 削除: 何度でも使えるようにするため
    
    console.log(`✅ 招待コード受け入れ: ${code} -> ${newUser.displayName} (${newUser.userType})`);
    
    return NextResponse.json({
      success: true,
      message: `${invitation.targetType === 'parent' ? '親' : '子'}アカウントが作成されました`,
      user: newUser,
      invitation: invitation
    });
    
  } catch (error) {
    console.error('招待コード受け入れエラー:', error);
    return NextResponse.json({
      success: false,
      error: '招待コードの処理中にエラーが発生しました'
    }, { status: 500 });
  }
}