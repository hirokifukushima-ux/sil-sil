import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // 全ての招待コードを取得
    const invitations = await db.getInvitations();
    
    // Y387DTQLコードを探す
    const y387dtqlInvitation = invitations.find(inv => inv.code === 'Y387DTQL');
    
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PUBLIC_USE_DATABASE: process.env.NEXT_PUBLIC_USE_DATABASE,
      NEXT_PUBLIC_SKIP_AUTH: process.env.NEXT_PUBLIC_SKIP_AUTH,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'not set',
      timestamp: new Date().toISOString()
    };

    // 全てのユーザーも取得
    const users = await db.getUsers();
    
    // 全ての記事も取得
    const allArticles = await db.getArticles();
    
    return NextResponse.json({
      success: true,
      environment: envInfo,
      invitations: {
        total: invitations.length,
        y387dtql: y387dtqlInvitation || 'NOT FOUND',
        all: invitations.map(inv => ({
          code: inv.code,
          status: inv.status,
          email: inv.email,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          acceptedAt: inv.acceptedAt,
          acceptedBy: inv.acceptedBy
        }))
      },
      users: {
        total: users.length,
        all: users.map(user => ({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          userType: user.userType,
          createdAt: user.createdAt,
          parentId: user.parentId
        }))
      },
      articles: {
        total: allArticles.length,
        all: allArticles.map(article => ({
          id: article.id,
          convertedTitle: article.convertedTitle,
          parentId: article.parentId,
          createdAt: article.createdAt
        }))
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}