import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // TODO: 認証チェック（マスターユーザーのみ）
    
    const db = getDatabase();
    
    // 並行してデータを取得
    const [
      organizations,
      allParents,
      allChildren,
      articles,
      invitations
    ] = await Promise.all([
      db.getOrganizations({ isActive: true }),
      db.getUsers({ userType: 'parent' }),
      db.getUsers({ userType: 'child' }),
      db.getArticles(),
      db.getInvitations()
    ]);
    
    // 期間別フィルタリング
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const parents = allParents;
    const children = allChildren;
    
    // アクティブユーザー数を計算
    const activeParents = parents.filter(p => p.isActive).length;
    const activeChildren = children.filter(c => c.isActive).length;
    const activeUsers = activeParents + activeChildren;
    
    // カテゴリ別記事数を計算
    const categoryCounts = articles.reduce((acc, article) => {
      const category = article.category || 'その他';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    // 期間別新規登録数を計算
    const newParentsThisMonth = parents.filter(p => new Date(p.createdAt) >= thisMonth).length;
    const newChildrenThisMonth = children.filter(c => new Date(c.createdAt) >= thisMonth).length;
    const newParentsThisWeek = parents.filter(p => new Date(p.createdAt) >= thisWeek).length;
    const newChildrenThisWeek = children.filter(c => new Date(c.createdAt) >= thisWeek).length;
    
    // 招待統計
    const pendingInvitations = invitations.filter(inv => inv.status === 'pending').length;
    const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted').length;
    const expiredInvitations = invitations.filter(inv => inv.status === 'expired').length;
    
    // ログイン活動統計
    const lastWeekLogins = [
      ...parents.filter(p => p.lastLoginAt && new Date(p.lastLoginAt) >= thisWeek),
      ...children.filter(c => c.lastLoginAt && new Date(c.lastLoginAt) >= thisWeek)
    ].length;
    
    // 親ごとの子アカウント数統計
    const parentChildCounts = parents.map(parent => {
      const childCount = children.filter(child => child.parentId === parent.id).length;
      return { parentId: parent.id, childCount };
    });
    
    const avgChildrenPerParent = parents.length > 0 ? 
      parentChildCounts.reduce((sum, p) => sum + p.childCount, 0) / parents.length : 0;
    
    const stats = {
      // 基本統計
      totalOrganizations: organizations.length,
      totalParents: parents.length,
      totalChildren: children.length,
      activeUsers: activeUsers,
      totalArticles: articles.length,
      activeParents: activeParents,
      activeChildren: activeChildren,
      categoryCounts: categoryCounts,
      
      // 期間別統計
      newUsersThisMonth: {
        parents: newParentsThisMonth,
        children: newChildrenThisMonth,
        total: newParentsThisMonth + newChildrenThisMonth
      },
      newUsersThisWeek: {
        parents: newParentsThisWeek,
        children: newChildrenThisWeek,
        total: newParentsThisWeek + newChildrenThisWeek
      },
      
      // 招待統計
      invitations: {
        total: invitations.length,
        pending: pendingInvitations,
        accepted: acceptedInvitations,
        expired: expiredInvitations,
        acceptanceRate: invitations.length > 0 ? 
          Math.round((acceptedInvitations / invitations.length) * 100) : 0
      },
      
      // 活動統計
      activity: {
        lastWeekLogins: lastWeekLogins,
        avgChildrenPerParent: Math.round(avgChildrenPerParent * 10) / 10,
        parentChildCounts: parentChildCounts
      },
      
      // トレンド情報
      trends: {
        userGrowthRate: parents.length > 0 ? 
          Math.round((newParentsThisMonth / parents.length) * 100) : 0,
        articlesThisMonth: articles.filter(a => 
          new Date(a.createdAt) >= thisMonth
        ).length
      }
    };
    
    return NextResponse.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('統計データ取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: '統計データの取得中にエラーが発生しました'
    }, { status: 500 });
  }
}