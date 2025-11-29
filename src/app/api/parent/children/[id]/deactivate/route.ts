import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 認証情報を取得
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
    const { id } = await params;  // Next.js 15対応: paramsを非同期で取得
    const childId = id;
    
    if (!childId) {
      return NextResponse.json({
        success: false,
        error: '子アカウントIDが必要です'
      }, { status: 400 });
    }
    
    const db = getDatabase();
    
    // 子アカウントの存在確認と親子関係チェック
    const child = await db.getUser(childId);
    
    if (!child) {
      return NextResponse.json({
        success: false,
        error: '子アカウントが見つかりません'
      }, { status: 404 });
    }
    
    if (child.parentId !== parentId) {
      return NextResponse.json({
        success: false,
        error: 'この子アカウントを管理する権限がありません'
      }, { status: 403 });
    }
    
    // 子アカウントを無効化
    const success = await db.deactivateUser(childId);
    
    if (success) {
      console.log(`👶❌ 子アカウントを無効化: ${child.displayName} (ID: ${childId})`);
      
      return NextResponse.json({
        success: true,
        message: '子アカウントを無効化しました'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '子アカウントの無効化に失敗しました'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('子アカウント無効化エラー:', error);
    return NextResponse.json({
      success: false,
      error: '子アカウントの無効化中にエラーが発生しました'
    }, { status: 500 });
  }
}