import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invitation code is required' 
      }, { status: 400 });
    }
    
    const db = getDatabase();
    
    // 招待を取得
    const invitation = await db.getInvitation(code);
    if (!invitation) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invitation not found' 
      }, { status: 404 });
    }
    
    // 招待をpendingに戻す（acceptedByとacceptedAtをクリア）
    const updatedInvitation = await db.updateInvitation(invitation.id, {
      status: 'pending',
      acceptedBy: undefined,
      acceptedAt: undefined,
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      invitation: updatedInvitation,
      message: `Invitation ${code} has been reset to pending status`
    });
    
  } catch (error) {
    console.error('❌ Reset invitation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}