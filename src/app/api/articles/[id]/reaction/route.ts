import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseError } from '@/lib/database';

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
    
    // 新しいデータベース抽象化層にリアクションを保存
    const db = getDatabase();
    const articleId = parseInt(id);
    
    // 記事の存在確認
    const article = await db.getArticleById(articleId);
    if (!article) {
      return NextResponse.json(
        { error: '指定された記事が見つかりません' },
        { status: 404 }
      );
    }
    
    // リアクション追加
    const success = await db.addReaction(articleId, childId, reaction);
    
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
    
    if (!success) {
      return NextResponse.json(
        { error: 'リアクションの保存に失敗しました' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message,
      reaction,
      articleId: articleId,
      childId
    });
    
  } catch (error) {
    console.error('リアクション処理エラー:', error);
    
    // DatabaseErrorの特別処理
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { 
          error: `データベースエラー: ${error.message}`,
          code: error.code
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `リアクションの処理中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}