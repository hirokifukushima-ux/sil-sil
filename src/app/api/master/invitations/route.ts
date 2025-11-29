import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // TODO: 認証チェック（マスターユーザーのみ）
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as 'pending' | 'accepted' | 'expired' | null;
    const targetType = url.searchParams.get('targetType') as 'parent' | 'child' | null;
    const inviterType = url.searchParams.get('inviterType') as 'master' | 'parent' | null;
    
    const db = getDatabase();
    const filters: any = {};
    
    if (status) {
      filters.status = status;
    }
    if (targetType) {
      filters.targetType = targetType;
    }
    if (inviterType) {
      filters.inviterType = inviterType;
    }
    
    const invitations = await db.getInvitations(filters);
    
    return NextResponse.json({
      success: true,
      invitations: invitations,
      summary: {
        total: invitations.length,
        byStatus: {
          pending: invitations.filter(i => i.status === 'pending').length,
          accepted: invitations.filter(i => i.status === 'accepted').length,
          expired: invitations.filter(i => i.status === 'expired').length
        },
        byTargetType: {
          parent: invitations.filter(i => i.targetType === 'parent').length,
          child: invitations.filter(i => i.targetType === 'child').length
        }
      }
    });
    
  } catch (error) {
    console.error('招待一覧取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: '招待一覧の取得中にエラーが発生しました'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // TODO: 認証チェック（マスターユーザーのみ）
    
    const { invitationIds } = await request.json();
    
    if (!invitationIds || !Array.isArray(invitationIds)) {
      return NextResponse.json({
        success: false,
        error: '削除する招待IDが必要です'
      }, { status: 400 });
    }
    
    const db = getDatabase();
    let deletedCount = 0;
    
    for (const id of invitationIds) {
      const success = await db.deleteInvitation(id);
      if (success) deletedCount++;
    }
    
    console.log(`📨❌ ${deletedCount}件の招待を削除`);
    
    return NextResponse.json({
      success: true,
      message: `${deletedCount}件の招待を削除しました`,
      deletedCount: deletedCount
    });
    
  } catch (error) {
    console.error('招待削除エラー:', error);
    return NextResponse.json({
      success: false,
      error: '招待の削除中にエラーが発生しました'
    }, { status: 500 });
  }
}