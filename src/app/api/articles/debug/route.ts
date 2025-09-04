import { NextResponse } from 'next/server';

// デバッグ用：記事ストレージの状況を確認
export async function GET() {
  try {
    // 記事ストアを直接インポートして最新状態を取得
    await import('@/lib/article-store');
    const articleStore = (globalThis as { articleStore?: Map<number, unknown> }).articleStore || new Map();
    
    const articles = Array.from(articleStore.values());
    const debugInfo = {
      totalArticles: articles.length,
      articles: articles.map(article => ({
        id: article.id,
        title: article.convertedTitle?.substring(0, 50) + '...' || article.originalTitle?.substring(0, 50) + '...',
        isArchived: article.isArchived,
        createdAt: article.createdAt,
        hasRead: article.hasRead
      })),
      archivedCount: articles.filter(a => a.isArchived === true).length,
      activeCount: articles.filter(a => a.isArchived !== true).length,
      undefinedArchivedCount: articles.filter(a => a.isArchived === undefined).length
    };
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('❌ デバッグ情報取得エラー:', error);
    return NextResponse.json(
      { error: `デバッグ情報の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}