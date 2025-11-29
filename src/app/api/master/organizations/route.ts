import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // TODO: 認証チェック（マスターユーザーのみ）
    
    const db = getDatabase();
    const organizations = await db.getOrganizations({ isActive: true });
    
    // 各組織の親・子アカウント数を取得
    const orgsWithCounts = await Promise.all(
      organizations.map(async (org) => {
        const parents = await db.getUsers({ 
          userType: 'parent',
          organizationId: org.id 
        });
        const children = await db.getUsers({ 
          userType: 'child',
          organizationId: org.id 
        });
        
        return {
          ...org,
          parentCount: parents.length,
          childCount: children.length
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      organizations: orgsWithCounts
    });
    
  } catch (error) {
    console.error('組織一覧取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: '組織一覧の取得中にエラーが発生しました'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: 認証チェック（マスターユーザーのみ）

    const { name, masterId } = await request.json();

    if (!name) {
      return NextResponse.json({
        success: false,
        error: '組織名は必須です'
      }, { status: 400 });
    }

    if (!masterId) {
      return NextResponse.json({
        success: false,
        error: 'マスターIDは必須です'
      }, { status: 400 });
    }

    const db = getDatabase();

    // 組織作成
    const organization = await db.createOrganization({
      name: name,
      masterId: masterId,
      isActive: true
    });
    
    console.log(`🏢 組織を作成: ${organization.name} (ID: ${organization.id})`);
    
    return NextResponse.json({
      success: true,
      message: '組織を作成しました',
      organization: organization
    });
    
  } catch (error) {
    console.error('組織作成エラー:', error);
    return NextResponse.json({
      success: false,
      error: '組織の作成中にエラーが発生しました'
    }, { status: 500 });
  }
}