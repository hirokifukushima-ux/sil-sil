import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

/**
 * 招待コードでのログインAPI
 * - 既に受け入れ済みの招待コードで再ログイン可能
 * - 未受け入れの場合は新規アカウント作成
 */
export async function POST(request: Request) {
  try {
    const { code, email, displayName } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '招待コードが必要です' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 招待コードを検索
    const invitation = await db.getInvitation(code);

    if (!invitation) {
      return NextResponse.json(
        { error: '招待コードが見つかりません' },
        { status: 404 }
      );
    }

    // 有効期限チェック
    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: '招待コードの有効期限が切れています' },
        { status: 400 }
      );
    }

    // 既に受け入れ済みかチェック
    if (invitation.status === 'accepted') {
      // 受け入れ済み - acceptedUserIdで確実に同じユーザーを返す
      let selectedUser = null;

      // 新しいロジック: acceptedUserIdが存在する場合は直接取得
      if (invitation.acceptedUserId) {
        selectedUser = await db.getUser(invitation.acceptedUserId);
      }

      // 後方互換性: acceptedUserIdがない場合は従来の検索ロジック（最初に作成されたユーザーを使用）
      if (!selectedUser) {
        const users = await db.getUsers({
          userType: invitation.targetType,
          isActive: true
        });

        const matchedUsers = users.filter(u => {
          // emailが一致する場合
          if (u.email && invitation.email && u.email.toLowerCase() === invitation.email.toLowerCase()) {
            return true;
          }
          // created_byがinviterIdと一致する場合
          if (u.createdBy === invitation.inviterId) {
            return true;
          }
          return false;
        });

        // 複数マッチした場合は最初に作成されたユーザーを選択（最新ではない！）
        if (matchedUsers.length > 0) {
          selectedUser = matchedUsers.sort((a, b) =>
            new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
          )[0];
        }
      }

      if (selectedUser) {
        return NextResponse.json({
          success: true,
          isNewUser: false,
          user: {
            id: selectedUser.id,
            email: selectedUser.email,
            displayName: selectedUser.displayName,
            userType: selectedUser.userType,
            parentId: selectedUser.parentId,
            masterId: selectedUser.masterId,
            organizationId: selectedUser.organizationId
          }
        });
      } else {
        return NextResponse.json(
          { error: '招待コードは既に使用されていますが、ユーザーが見つかりません' },
          { status: 404 }
        );
      }
    } else if (invitation.status === 'pending') {
      // 未受け入れ - 新規アカウント作成
      const newUser = await db.createUser({
        email: email || invitation.email,
        displayName: displayName || `New ${invitation.targetType}`,
        userType: invitation.targetType,
        parentId: invitation.parentId,
        masterId: invitation.inviterType === 'master' ? invitation.inviterId : undefined,
        organizationId: invitation.organizationId,
        isActive: true,
        createdBy: invitation.inviterId
      });

      // 招待ステータスを更新
      await db.acceptInvitation(code, newUser.id);

      return NextResponse.json({
        success: true,
        isNewUser: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          userType: newUser.userType,
          parentId: newUser.parentId,
          masterId: newUser.masterId,
          organizationId: newUser.organizationId
        }
      });
    } else {
      return NextResponse.json(
        { error: '招待コードのステータスが無効です' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('招待ログインエラー:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
