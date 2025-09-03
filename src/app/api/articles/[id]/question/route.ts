import { NextRequest, NextResponse } from 'next/server';

interface QuestionRequest {
  question: string;
  childId: string;
  articleTitle?: string;
  articleSummary?: string;
}

// インメモリストレージ（質問用）
const globalForQuestions = globalThis as unknown as {
  questionsStore: Array<{
    id: string;
    articleId: string;
    question: string;
    childId: string;
    articleTitle?: string;
    articleSummary?: string;
    createdAt: string;
    status: 'pending' | 'answered';
    parentAnswer?: string;
  }> | undefined;
};

const questionsStore = globalForQuestions.questionsStore ?? [];
globalForQuestions.questionsStore = questionsStore;

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
    
    // 質問をストアに保存
    const newQuestion = {
      id: Date.now().toString(),
      articleId: id,
      question: question.trim(),
      childId: childId,
      articleTitle: articleTitle,
      articleSummary: articleSummary,
      createdAt: new Date().toISOString(),
      status: 'pending' as const
    };
    
    questionsStore.push(newQuestion);
    
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
    const questions = questionsStore.filter(q => q.articleId === id);
    
    return NextResponse.json({
      success: true,
      questions: questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    });
    
  } catch (error) {
    console.error('質問取得エラー:', error);
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
    
    // 該当する質問を探して更新
    const question = questionsStore.find(q => q.id === questionId && q.articleId === id);
    
    if (!question) {
      return NextResponse.json(
        { error: '質問が見つかりません' },
        { status: 404 }
      );
    }
    
    question.status = 'answered';
    question.parentAnswer = answer;
    
    console.log(`💬 質問に回答: ${questionId} -> "${answer}"`);
    
    return NextResponse.json({
      success: true,
      message: '回答を送信しました',
      question: question
    });
    
  } catch (error) {
    console.error('回答送信エラー:', error);
    return NextResponse.json(
      { error: '回答の送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
}