import { NextRequest, NextResponse } from 'next/server';
import { addReaction } from '@/lib/article-store';

interface ReactionRequest {
  reaction: 'good' | 'difficult' | 'question' | 'fun';
  childId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ReactionRequest = await request.json();
    const { reaction, childId } = body;
    
    if (!id || !reaction || !childId) {
      return NextResponse.json(
        { error: '記事ID、リアクション、子供IDが必要です' },
        { status: 400 }
      );
    }
    
    const validReactions = ['good', 'difficult', 'question', 'fun'];
    if (!validReactions.includes(reaction)) {
      return NextResponse.json(
        { error: '無効なリアクションタイプです' },
        { status: 400 }
      );
    }
    
    // インメモリストアにリアクションを保存
    const success = addReaction(parseInt(id), reaction, childId);
    
    if (!success) {
      return NextResponse.json(
        { error: '記事が見つかりません' },
        { status: 404 }
      );
    }
    
    // リアクションに応じたレスポンスメッセージ
    let message = '';
    switch (reaction) {
      case 'good':
        message = 'わかったね！すごい！ 🎉';
        break;
      case 'difficult':
        message = 'むずかしかったね。また一緒に読んでみよう！ 📚';
        break;
      case 'question':
        message = 'いい質問だね！お父さんお母さんに聞いてみよう！ ❓';
        break;
      case 'fun':
        message = '楽しんでもらえて嬉しい！ 😊';
        break;
    }
    
    return NextResponse.json({
      success: true,
      message,
      reaction,
      articleId: parseInt(id),
      childId
    });
    
  } catch (error) {
    console.error('リアクション処理エラー:', error);
    return NextResponse.json(
      { error: `リアクションの処理中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}