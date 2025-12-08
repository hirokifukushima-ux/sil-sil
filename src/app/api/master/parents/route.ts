import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// 招待コード生成関数
function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    // TODO: 認証チェック（マスターユーザーのみ）
    
    const db = getDatabase();
    const parents = await db.getUsers({ userType: 'parent' });
    
    // 子アカウント数を取得
    const parentsWithChildCount = await Promise.all(
      parents.map(async (parent) => {
        const children = await db.getUsers({ parentId: parent.id });
        return {
          ...parent,
          childrenCount: children.length
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      parents: parentsWithChildCount
    });
    
  } catch (error) {
    console.error('親アカウント一覧取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: '親アカウント一覧の取得中にエラーが発生しました'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: 認証チェック（マスターユーザーのみ）

    const { email, displayName, organizationId, masterId } = await request.json();

    if (!email || !displayName) {
      return NextResponse.json({
        success: false,
        error: 'メールアドレスと表示名は必須です'
      }, { status: 400 });
    }

    if (!masterId) {
      return NextResponse.json({
        success: false,
        error: 'マスターユーザーIDが必要です'
      }, { status: 400 });
    }

    const db = getDatabase();

    // 既存ユーザーチェック
    const existingUsers = await db.getUsers();
    const existingUser = existingUsers.find(u => u.email === email);

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'このメールアドレスは既に登録されています'
      }, { status: 400 });
    }

    // 招待コード生成
    const invitationCode = generateInvitationCode();

    // 招待レコード作成
    const invitation = await db.createInvitation({
      email: email,
      inviterType: 'master',
      inviterId: masterId,
      targetType: 'parent',
      organizationId: organizationId,
      status: 'pending',
      type: 'private', // Master作成の招待コードは1回限り
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7日後
    });
    
    console.log(`📨 親アカウント招待を作成: ${email} (コード: ${invitation.code})`);
    
    // TODO: 実際のメール送信機能
    console.log(`📧 招待メールを送信: ${email}`);
    console.log(`招待コード: ${invitation.code}`);
    console.log(`有効期限: ${invitation.expiresAt}`);
    
    return NextResponse.json({
      success: true,
      message: '招待を送信しました',
      invitationCode: invitation.code,
      invitation: invitation
    });
    
  } catch (error) {
    console.error('親アカウント招待作成エラー:', error);
    return NextResponse.json({
      success: false,
      error: '招待の作成中にエラーが発生しました'
    }, { status: 500 });
  }
}