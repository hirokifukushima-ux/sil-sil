import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// 招待コード生成関数
function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック（親ユーザーのみ）
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
    
    if (session.userType !== 'parent') {
      return NextResponse.json({
        success: false,
        error: '親アカウントのみ利用可能です'
      }, { status: 403 });
    }
    
    const parentId = session.userId;
    
    const db = getDatabase();
    const children = await db.getUsers({ 
      userType: 'child',
      parentId: parentId 
    });
    
    return NextResponse.json({
      success: true,
      children: children
    });
    
  } catch (error) {
    console.error('子アカウント一覧取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: '子アカウント一覧の取得中にエラーが発生しました'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（親ユーザーのみ）
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
    
    if (session.userType !== 'parent') {
      return NextResponse.json({
        success: false,
        error: '親アカウントのみ利用可能です'
      }, { status: 403 });
    }
    
    const parentId = session.userId;
    
    const { displayName, childAge, email } = await request.json();
    
    if (!displayName || !childAge) {
      return NextResponse.json({
        success: false,
        error: '表示名と年齢は必須です'
      }, { status: 400 });
    }
    
    if (childAge < 3 || childAge > 18) {
      return NextResponse.json({
        success: false,
        error: '年齢は3歳から18歳までで入力してください'
      }, { status: 400 });
    }
    
    const db = getDatabase();
    
    // 招待コード生成
    const invitationCode = generateInvitationCode();
    
    if (email) {
      // メールで招待する場合
      const invitation = await db.createInvitation({
        email: email,
        inviterType: 'parent',
        inviterId: parentId,
        targetType: 'child',
        parentId: parentId,
        status: 'pending',
        type: 'public', // 子アカウント用は再利用可能
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30日後
      });
      
      console.log(`📨 子アカウント招待を作成: ${email} (コード: ${invitation.code})`);
      
      // TODO: メール送信
      console.log(`📧 子アカウント招待メールを送信: ${email}`);
      
      return NextResponse.json({
        success: true,
        message: '子アカウントの招待を送信しました',
        invitationCode: invitation.code,
        invitation: invitation
      });
      
    } else {
      // 直接子アカウントを作成（即座にアクティブ化）
      const childUser = await db.createUser({
        userType: 'child',
        displayName: displayName,
        childAge: childAge,
        parentId: parentId,
        masterId: session.masterId,
        organizationId: session.organizationId,
        isActive: true, // 作成と同時にアクティブ化（親がすぐに一覧で確認できるように）
        createdBy: parentId
      });
      
      // アクティベーション用の招待コード作成
      const invitation = await db.createInvitation({
        email: `${childUser.id}@temp.local`,
        inviterType: 'parent',
        inviterId: parentId,
        targetType: 'child',
        parentId: parentId,
        status: 'pending',
        type: 'public', // 子アカウント用は再利用可能
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1年後
      });
      
      console.log(`👶 子アカウントを作成: ${displayName} (ID: ${childUser.id}, コード: ${invitation.code})`);
      
      return NextResponse.json({
        success: true,
        message: '子アカウントを作成しました',
        child: childUser,
        activationCode: invitation.code
      });
    }
    
  } catch (error) {
    console.error('子アカウント作成エラー:', error);
    return NextResponse.json({
      success: false,
      error: '子アカウントの作成中にエラーが発生しました'
    }, { status: 500 });
  }
}