import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getAuthSession } from '@/lib/auth';

export interface ConvertedArticle {
  title: string;
  content: string;
  originalTitle: string;
  summary: string;
  convertedAt: string;
}

// 年齢レベル別のシステムプロンプトを生成
function getSystemPromptForAge(age: number): string {
  // 基本プロンプト
  let prompt = `あなたは優秀な教育者で、`;
  let ageDescription = '';
  let rules = '';

  if (age <= 7) {
    // ELI5-7: 幼児〜小学校低学年
    ageDescription = '幼児から小学校低学年（5〜7歳）';
    rules = `
## 変換ルール：
1. **語彙・表現**：
   - とても簡単な言葉だけを使う
   - 1つの文は短く、10文字程度まで
   - 「〜だよ」「〜なんだ」などの親しみやすい表現

2. **構造・内容**：
   - 一番大事なこと1つだけを説明
   - 「これはね、〜ということだよ」のように優しく説明
   - 身近なもの（おもちゃ、食べ物、家族など）で例える

3. **文章スタイル**：
   - とても短い文章
   - 「〜だよ・〜だね」調
   - 楽しい気持ちになる表現`;
  } else if (age <= 10) {
    // ELI8-10: 小学校中学年
    ageDescription = '小学校中学年（8〜10歳）';
    rules = `
## 変換ルール：
1. **語彙・表現**：
   - 簡単な言葉を中心に使う
   - 難しい言葉は使わない
   - 自然な丁寧語を使用

2. **構造・内容**：
   - 大切なポイントを2つまで説明
   - 「なぜそうなったか」を簡単に説明
   - 学校や日常生活の例で説明

3. **文章スタイル**：
   - 短めの文章で分かりやすく
   - 「〜です・〜ます」調
   - 興味を持てる表現を使用`;
  } else if (age <= 13) {
    // ELI11-13: 小学校高学年〜中学生
    ageDescription = '小学校高学年から中学生（11〜13歳）';
    rules = `
## 変換ルール：
1. **語彙・表現**：
   - 難しい専門用語は簡単な言葉に置き換える
   - 敬語は自然な丁寧語に変更

2. **構造・内容**：
   - 重要なポイントを3つ以内に整理
   - 「なぜこれが大切なのか」を説明
   - 身近な例で説明

3. **文章スタイル**：
   - 適度な長さの文章で分かりやすく
   - 「〜です・〜ます」調
   - 興味を引く表現を使用`;
  } else {
    // ELI14-18: 高校生レベル
    ageDescription = '高校生（14〜18歳）';
    rules = `
## 変換ルール：
1. **語彙・表現**：
   - 専門用語も適度に使用（必要に応じて説明を追加）
   - より正確で詳細な表現を使用

2. **構造・内容**：
   - 重要なポイントを整理して説明
   - 背景や文脈も含めて詳しく説明
   - 因果関係や影響を論理的に説明

3. **文章スタイル**：
   - しっかりとした文章構成
   - 「〜です・〜ます」調または「である」調
   - 客観的で正確な表現`;
  }

  prompt += `${ageDescription}向けにニュース記事を分かりやすく変換する専門家です。

${rules}

4. **避けるべき内容**：
   - 過度に恐怖を煽る表現
   - 年齢に不適切なコンテンツ

## 出力形式：
タイトル: [年齢に合わせた分かりやすいタイトル]

内容: [変換された記事内容]

要約: [3行以内の簡潔な要約]`;

  return prompt;
}

// 記事を子供向けに変換する関数
async function convertToChildFriendly(
  title: string,
  content: string,
  targetAge: number = 12,
  userId?: string
): Promise<ConvertedArticle> {
  try {
    // 年齢レベルに応じたシステムプロンプトを生成
    const systemPrompt = getSystemPromptForAge(targetAge);

    console.log(`🎯 変換対象年齢レベル: ELI${targetAge}`);

    // OpenAI APIを使用して変換
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `以下のニュース記事を${targetAge}歳レベルで分かりやすく変換してください：

タイトル: ${title}

内容: ${content}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const convertedText = data.choices[0].message.content;

    // トークン使用量をログに出力し、データベースを更新
    if (data.usage) {
      const { prompt_tokens, completion_tokens, total_tokens } = data.usage;
      const inputCost = (prompt_tokens / 1000000) * 0.150; // $0.150 per 1M tokens
      const outputCost = (completion_tokens / 1000000) * 0.600; // $0.600 per 1M tokens
      const totalCost = inputCost + outputCost;

      console.log(`📊 トークン使用量: 入力=${prompt_tokens}, 出力=${completion_tokens}, 合計=${total_tokens}`);
      console.log(`💰 推定コスト: 入力=$${inputCost.toFixed(6)}, 出力=$${outputCost.toFixed(6)}, 合計=$${totalCost.toFixed(6)} (≈${(totalCost * 150).toFixed(2)}円)`);

      // トークン使用量をデータベースに記録
      if (userId) {
        try {
          const db = getDatabase();
          await db.updateUserTokenUsage(userId, total_tokens);
          console.log(`✅ ユーザー ${userId} のトークン使用量を更新: +${total_tokens} トークン`);
        } catch (error) {
          console.error('❌ トークン使用量更新エラー:', error);
          // エラーが発生しても記事変換は続行
        }
      }
    }

    // レスポンスをパース
    const titleMatch = convertedText.match(/タイトル:\s*(.+?)(?:\n|$)/);
    const contentMatch = convertedText.match(/内容:\s*([\s\S]*?)(?:\n要約:|$)/);
    const summaryMatch = convertedText.match(/要約:\s*([\s\S]*?)$/);

    const convertedTitle = titleMatch ? titleMatch[1].trim() : title;
    const convertedContent = contentMatch ? contentMatch[1].trim() : convertedText;
    const convertedSummary = summaryMatch ? summaryMatch[1].trim() : convertedContent.substring(0, 200) + '...';

    return {
      title: convertedTitle,
      content: convertedContent,
      originalTitle: title,
      summary: convertedSummary,
      convertedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('変換エラー:', error);
    
    // フォールバック: 簡単な変換
    return {
      title: `【わかりやすく】${title}`,
      content: `元の記事：${title}\n\n${content}\n\n※この記事を子供向けに変換する際にエラーが発生しました。元の内容をそのまま表示しています。`,
      originalTitle: title,
      summary: '記事の変換中にエラーが発生しました',
      convertedAt: new Date().toISOString()
    };
  }
}

// タイトルからカテゴリを推定する関数
function inferCategoryFromTitle(title: string): string {
  const keywords = {
    'スポーツ': ['野球', 'サッカー', 'テニス', 'ゴルフ', 'バスケ', 'オリンピック', '選手', 'チーム', '試合', '勝利', '敗戦', 'FA', 'WS', 'ワールドシリーズ', 'カブス', 'パドレス', 'ドジャース'],
    '科学': ['宇宙', '火星', '探査機', 'NASA', '化石', '恐竜', '研究', '発見', '実験', '技術'],
    '政治': ['政府', '市長', '選挙', '政策', '法案', '国会', '首相', '大統領'],
    '経済': ['株価', '経済', '企業', '売上', '業績', '投資', '金融', '銀行', 'GDP'],
    '教育': ['学校', '大学', '高校', '中学', '小学', '教育', '授業', '先生', '教員', 'ストライキ', '日大'],
    '国際': ['海外', '米国', 'アメリカ', '中国', '韓国', '欧州', 'トロント', 'カナダ', 'ロサンゼルス'],
    '社会': ['事件', '事故', '裁判', '逮捕', '判決', '警察', '消防']
  };

  for (const [category, keywordList] of Object.entries(keywords)) {
    if (keywordList.some(keyword => title.includes(keyword))) {
      return category;
    }
  }
  
  return 'ニュース'; // デフォルトカテゴリ
}

export async function POST(request: NextRequest) {
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
    
    if (!session || session.userType !== 'parent') {
      return NextResponse.json({
        success: false,
        error: '記事変換は親アカウントでのみ利用できます'
      }, { status: 403 });
    }
    
    const { title, content, originalUrl, image, source, childAge, childId } = await request.json();

    if (!title || !content) {
      return NextResponse.json({
        success: false,
        error: 'タイトルと内容が必要です'
      }, { status: 400 });
    }

    // childIdが指定されていない場合は警告（将来的には必須にする）
    if (!childId) {
      console.warn('⚠️  childIdが指定されていません。childAgeのみで記事を作成します。');
    }

    // トークン制限をチェック
    const db = getDatabase();
    try {
      const tokenUsage = await db.getUserTokenUsage(session.userId);
      const remainingTokens = tokenUsage.tokenLimit - tokenUsage.totalTokensUsed;

      console.log(`📊 トークン使用状況: ${tokenUsage.totalTokensUsed}/${tokenUsage.tokenLimit} (残り: ${remainingTokens})`);

      if (tokenUsage.totalTokensUsed >= tokenUsage.tokenLimit) {
        return NextResponse.json({
          success: false,
          error: 'トークン使用上限に達しました',
          details: {
            used: tokenUsage.totalTokensUsed,
            limit: tokenUsage.tokenLimit,
            resetAt: tokenUsage.tokensResetAt
          }
        }, { status: 429 });
      }
    } catch (error) {
      console.warn('⚠️  トークン使用量チェックエラー（処理続行）:', error);
    }

    console.log(`🔄 記事変換開始: ${title} (親: ${session.userId}, 対象年齢レベル: ${childAge || 12})`);

    const convertedArticle = await convertToChildFriendly(title, content, childAge || 12, session.userId);
    
    // タイトルからカテゴリを推定
    const inferredCategory = inferCategoryFromTitle(title);
    
    // データベースに保存
    try {
      const db = getDatabase();
      
      const savedArticle = await db.createArticle({
        originalUrl: originalUrl || '',
        childAge: childAge || 10, // 選択された子どもの年齢、なければデフォルト10歳
        childId: childId, // 対象の子どもID（個別管理用）
        originalTitle: title,
        convertedTitle: convertedArticle.title,
        originalContent: content,
        convertedContent: convertedArticle.content,
        convertedSummary: convertedArticle.summary,
        category: inferredCategory, // タイトルから推定したカテゴリ
        status: 'completed',
        siteName: source || 'ニュースサイト',
        image: image,
        hasRead: false,
        reactions: [],
        isArchived: false,
        parentId: session.userId, // 親アカウントIDを記録
        organizationId: session.organizationId // 組織IDも記録
      });
      
      console.log(`💾 記事をデータベースに保存: ID ${savedArticle.id}`);
      
      // ConvertedArticleにデータベースIDを追加
      const convertedArticleWithId = {
        ...convertedArticle,
        id: savedArticle.id
      };
      
      console.log(`✅ 記事変換完了: ${convertedArticle.title}`);
      
      return NextResponse.json({
        success: true,
        convertedArticle: convertedArticleWithId,
        articleId: savedArticle.id,
        convertedAt: new Date().toISOString()
      });
      
    } catch (dbError) {
      console.error('データベース保存エラー:', dbError);
      
      // データベース保存に失敗しても変換結果は返す
      console.log(`✅ 記事変換完了（DB保存失敗）: ${convertedArticle.title}`);
      
      return NextResponse.json({
        success: true,
        convertedArticle,
        warning: 'データベースへの保存に失敗しましたが、変換は成功しました',
        convertedAt: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('記事変換エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: '記事の変換に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}