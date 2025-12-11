import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック - ヘッダーからセッション情報を取得
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

    if (!session || !session.userId) {
      return NextResponse.json({
        success: false,
        error: '認証情報が無効です'
      }, { status: 401 });
    }

    // トークン使用状況を取得
    const db = getDatabase();
    const tokenUsage = await db.getUserTokenUsage(session.userId);

    const remainingTokens = tokenUsage.tokenLimit - tokenUsage.totalTokensUsed;
    const usagePercentage = Math.round((tokenUsage.totalTokensUsed / tokenUsage.tokenLimit) * 100);

    // 推定コスト計算（GPT-4o-mini: 約$0.375 per 1M tokens average）
    const estimatedCostUSD = (tokenUsage.totalTokensUsed / 1000000) * 0.375;
    const estimatedCostJPY = estimatedCostUSD * 150; // 1ドル=150円で計算

    return NextResponse.json({
      success: true,
      tokenUsage: {
        totalTokensUsed: tokenUsage.totalTokensUsed,
        tokenLimit: tokenUsage.tokenLimit,
        remainingTokens: remainingTokens,
        usagePercentage: usagePercentage,
        tokensResetAt: tokenUsage.tokensResetAt.toISOString(),
        estimatedCost: {
          usd: estimatedCostUSD,
          jpy: estimatedCostJPY
        }
      }
    });

  } catch (error) {
    console.error('トークン使用状況取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'トークン使用状況の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
