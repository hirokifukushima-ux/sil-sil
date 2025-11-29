import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// 開発用の簡易パスワード設定
const PASSWORDS = {
  parent: 'parent123',
  child: 'kids123',
  master: 'master999'
};

export async function POST(request: Request) {
  try {
    const { email, password, userType } = await request.json();

    // パスワード検証
    if (password !== PASSWORDS[userType as keyof typeof PASSWORDS]) {
      return NextResponse.json(
        { error: 'パスワードが間違っています' },
        { status: 401 }
      );
    }

    const db = getDatabase();

    // マスターユーザーの場合
    if (userType === 'master') {
      const users = await db.getUsers({
        userType: 'master',
        isActive: true
      });

      const masterUser = users.find(u => u.email === email);

      if (!masterUser) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: masterUser.id,
          email: masterUser.email,
          displayName: masterUser.displayName,
          userType: masterUser.userType,
          masterId: masterUser.masterId,
          parentId: masterUser.parentId,
          organizationId: masterUser.organizationId
        }
      });
    }

    // 親ユーザーと子ユーザーの場合は既存のロジック
    // TODO: 実装する

    return NextResponse.json(
      { error: '未実装のユーザータイプです' },
      { status: 400 }
    );

  } catch (error) {
    console.error('ログインエラー:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
