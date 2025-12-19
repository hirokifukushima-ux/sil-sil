import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    
    // 注意：実際のプロダクションでは、削除ではなく「削除フラグ」を設定することを推奨
    // ここでは削除をシミュレートするために無効化を行う
    const success = await db.deactivateUser(childId);
    
    if (success) {
      console.log(`👶🗑️  子アカウントを削除（無効化）: ${child.displayName} (ID: ${childId})`);
      
      return NextResponse.json({
        success: true,
        message: '子アカウントを削除しました'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '子アカウントの削除に失敗しました'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('子アカウント削除エラー:', error);
    return NextResponse.json({
      success: false,
      error: '子アカウントの削除中にエラーが発生しました'
    }, { status: 500 });
  }
}

// 子アカウント詳細取得
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;
    const childId = id;
    
    const db = getDatabase();
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
    
    return NextResponse.json({
      success: true,
      child: child
    });
    
  } catch (error) {
    console.error('子アカウント取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: '子アカウントの取得中にエラーが発生しました'
    }, { status: 500 });
  }
}

// 子アカウント更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;
    const childId = id;
    
    const { displayName, childAge, isActive } = await request.json();
    
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
    
    // 更新データの準備
    const updates: any = {};
    
    if (displayName !== undefined) {
      updates.displayName = displayName;
    }
    
    if (childAge !== undefined) {
      if (childAge < 1 || childAge > 6) {
        return NextResponse.json({
          success: false,
          error: '理解度レベルは1から6までで選択してください'
        }, { status: 400 });
      }
      updates.childAge = childAge;
    }
    
    if (isActive !== undefined) {
      updates.isActive = isActive;
    }
    
    // 子アカウントを更新
    const updatedChild = await db.updateUser(childId, updates);
    
    if (updatedChild) {
      console.log(`👶✏️  子アカウントを更新: ${updatedChild.displayName} (ID: ${childId})`);
      
      return NextResponse.json({
        success: true,
        message: '子アカウントを更新しました',
        child: updatedChild
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '子アカウントの更新に失敗しました'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('子アカウント更新エラー:', error);
    return NextResponse.json({
      success: false,
      error: '子アカウントの更新中にエラーが発生しました'
    }, { status: 500 });
  }
}