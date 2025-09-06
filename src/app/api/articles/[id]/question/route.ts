import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseError } from '@/lib/database';

interface QuestionRequest {
  question: string;
  childId: string;
  articleTitle?: string;
  articleSummary?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: QuestionRequest = await request.json();
    const { question, childId, articleTitle, articleSummary } = body;
    
    if (!id || !question || !childId) {
      return NextResponse.json(
        { error: '記事ID、質問、子供IDが必要です' },
        { status: 400 }
      );
    }
    
    if (question.trim().length < 3) {
      return NextResponse.json(
        { error: '質問は3文字以上で入力してください' },
        { status: 400 }
      );
    }
    
    // 新しいデータベース抽象化層に質問を保存
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
    
    const newQuestion = await db.createQuestion({
      articleId: articleId,
      userId: childId,
      question: question.trim(),
      status: 'pending'
    });
    
    console.log(`💬 質問を受信: 記事${id} -> "${question}" (子供: ${childId})`);
    
    return NextResponse.json({
      success: true,
      message: 'しつもんを おくりました！おとうさん・おかあさんが こたえてくれるかも！',
      questionId: newQuestion.id,
      articleId: id,
      childId
    });
    
  } catch (error) {
    console.error('質問処理エラー:', error);
    
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
      { error: `質問の処理中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// 質問一覧取得（親用）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const articleId = parseInt(id);
    
    const questions = await db.getQuestions(articleId);
    
    return NextResponse.json({
      success: true,
      questions: questions
    });
    
  } catch (error) {
    console.error('質問取得エラー:', error);
    
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
      { error: '質問の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 質問への回答（親用）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { questionId, answer } = body;
    
    if (!questionId || !answer) {
      return NextResponse.json(
        { error: '質問IDと回答が必要です' },
        { status: 400 }
      );
    }
    
    // 新しいデータベース抽象化層で質問に回答
    const db = getDatabase();
    const updatedQuestion = await db.answerQuestion(questionId, answer);
    
    if (!updatedQuestion) {
      return NextResponse.json(
        { error: '質問が見つかりません' },
        { status: 404 }
      );
    }
    
    console.log(`💬 質問に回答: ${questionId} -> "${answer}"`);
    
    return NextResponse.json({
      success: true,
      message: '回答を送信しました',
      question: updatedQuestion
    });
    
  } catch (error) {
    console.error('回答送信エラー:', error);
    
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
      { error: '回答の送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
}