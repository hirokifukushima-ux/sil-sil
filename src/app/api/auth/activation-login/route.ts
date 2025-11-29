import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

/**
 * アクティベーションコードでのログインAPI
 * - 子アカウント作成時に生成されたアクティベーションコードでログイン
 */
export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'アクティベーションコードが必要です' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // アクティベーションコードで招待を検索
    const invitation = await db.getInvitation(code);

    if (!invitation) {
      return NextResponse.json(
        { error: 'アクティベーションコードが見つかりません' },
        { status: 404 }
      );
    }

    // 子アカウント用の招待か確認
    if (invitation.targetType !== 'child') {
      return NextResponse.json(
        { error: 'このコードは子アカウント用ではありません' },
        { status: 400 }
      );
    }

    // 有効期限チェック
    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'アクティベーションコードの有効期限が切れています' },
        { status: 400 }
      );
    }

    // emailからchildIdを抽出（email形式: {childId}@temp.local）
    const emailParts = invitation.email.split('@');
    if (emailParts.length === 2 && emailParts[1] === 'temp.local') {
      const childId = emailParts[0];

      // 子アカウントを検索
      const childUser = await db.getUser(childId);

      if (!childUser) {
        return NextResponse.json(
          { error: '子アカウントが見つかりません' },
          { status: 404 }
        );
      }

      if (childUser.userType !== 'child') {
        return NextResponse.json(
          { error: 'このアカウントは子アカウントではありません' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: childUser.id,
          displayName: childUser.displayName,
          userType: childUser.userType,
          childAge: childUser.childAge,
          parentId: childUser.parentId,
          masterId: childUser.masterId,
          organizationId: childUser.organizationId
        }
      });
    } else {
      // 代替方法: parentIdから子アカウントを検索
      if (invitation.parentId) {
        const children = await db.getUsers({
          userType: 'child',
          parentId: invitation.parentId
        });

        // 作成時刻が近い子アカウントを探す
        const invitationCreatedAt = new Date(invitation.createdAt);
        const matchingChild = children.find(child => {
          const childCreatedAt = new Date(child.createdAt!);
          const timeDiff = Math.abs(childCreatedAt.getTime() - invitationCreatedAt.getTime());
          // 10秒以内に作成されたアカウント
          return timeDiff < 10000;
        });

        if (matchingChild) {
          return NextResponse.json({
            success: true,
            user: {
              id: matchingChild.id,
              displayName: matchingChild.displayName,
              userType: matchingChild.userType,
              childAge: matchingChild.childAge,
              parentId: matchingChild.parentId,
              masterId: matchingChild.masterId,
              organizationId: matchingChild.organizationId
            }
          });
        }
      }

      return NextResponse.json(
        { error: 'アクティベーションコードに対応する子アカウントが見つかりません' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('アクティベーションログインエラー:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
