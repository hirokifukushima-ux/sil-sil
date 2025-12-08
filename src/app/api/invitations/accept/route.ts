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

    if (!displayName) {
      return NextResponse.json({
        success: false,
        error: '表示名が必要です'
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

    // 招待コードのtypeに応じた処理
    if (invitation.type === 'private') {
      // privateタイプ: 既に使用済みの場合は、そのユーザーで再ログイン可能にする
      if (invitation.status === 'accepted' && invitation.acceptedUserId) {
        // 既存ユーザーを取得してログイン
        const existingUser = await db.getUser(invitation.acceptedUserId);
        if (existingUser) {
          console.log(`🔄 招待コード再利用: ${code} -> ${existingUser.displayName} (${existingUser.userType})`);
          return NextResponse.json({
            success: true,
            message: `既存の${invitation.targetType === 'parent' ? '親' : '子'}アカウントでログインしました`,
            user: existingUser,
            invitation: invitation
          });
        }
      }

      // 期限チェック
      const now = new Date();
      const expiresAt = new Date(invitation.expiresAt);
      if (now > expiresAt) {
        return NextResponse.json({
          success: false,
          error: 'この招待コードは期限切れです'
        }, { status: 400 });
      }

      // 新規ユーザー作成の場合のみpendingチェック
      if (invitation.status !== 'pending') {
        return NextResponse.json({
          success: false,
          error: 'この招待コードは既に使用済みです'
        }, { status: 400 });
      }
    }
    // publicタイプ: 何度でも使用可能（追加のチェック不要）

    // ユーザーアカウントの作成（仮アカウント: メールアドレス未設定も可能）
    const newUser = await db.createUser({
      email: email || null, // メールアドレスは任意（後で設定可能）
      displayName: displayName,
      userType: invitation.targetType,
      parentId: invitation.parentId,
      masterId: invitation.inviterType === 'master' ? invitation.inviterId : undefined,
      organizationId: invitation.organizationId,
      isActive: true,
      createdBy: invitation.inviterId
    });

    // privateタイプの招待コードは使用済みに更新
    if (invitation.type === 'private') {
      await db.updateInvitation(invitation.id, {
        status: 'accepted',
        acceptedUserId: newUser.id,
        acceptedAt: new Date().toISOString()
      });
    }
    
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