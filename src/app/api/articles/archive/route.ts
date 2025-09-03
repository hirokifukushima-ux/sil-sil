import { NextRequest, NextResponse } from 'next/server';
import { archiveArticles, unarchiveArticles, getArchivedArticles } from '@/lib/article-store';

// アーカイブ記事の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    console.log(`📦 アーカイブ記事を取得中... (limit: ${limit})`);
    
    const archivedArticles = getArchivedArticles(limit);
    
    console.log(`✅ アーカイブ記事取得完了: ${archivedArticles.length}件`);
    
    return NextResponse.json({
      success: true,
      articles: archivedArticles,
      total: archivedArticles.length
    });
    
  } catch (error) {
    console.error('❌ アーカイブ記事取得エラー:', error);
    return NextResponse.json(
      { error: `アーカイブ記事の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// 記事のアーカイブ化
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleIds, action } = body;
    
    if (!articleIds || !Array.isArray(articleIds)) {
      return NextResponse.json(
        { error: '記事IDの配列が必要です' },
        { status: 400 }
      );
    }
    
    if (!action || (action !== 'archive' && action !== 'unarchive')) {
      return NextResponse.json(
        { error: 'actionは "archive" または "unarchive" である必要があります' },
        { status: 400 }
      );
    }
    
    let result;
    if (action === 'archive') {
      console.log(`📦 記事のアーカイブ化実行: ${articleIds.join(', ')}`);
      result = archiveArticles(articleIds);
    } else {
      console.log(`📤 記事のアーカイブ解除実行: ${articleIds.join(', ')}`);
      result = unarchiveArticles(articleIds);
    }
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${result.count}件の記事を${action === 'archive' ? 'アーカイブ' : 'アーカイブ解除'}しました`,
        count: result.count
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `一部の記事で問題が発生しました`,
        count: result.count,
        errors: result.errors
      }, { status: 207 }); // 207 Multi-Status
    }
    
  } catch (error) {
    console.error('❌ アーカイブ操作エラー:', error);
    return NextResponse.json(
      { error: `アーカイブ操作中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}