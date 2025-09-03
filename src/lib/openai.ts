import OpenAI from 'openai';

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ArticleContent {
  title: string;
  content: string;
  summary: string;
  category: string;
}

// 年齢に応じたプロンプトを生成
function generatePrompt(article: ArticleContent, childAge: number): string {
  let detailedPrompt = '';

  if (childAge <= 8) {
    // 小学校低学年
    detailedPrompt = `あなたは「ニュースラボ」の人気者の先生です。これからあなたには、難しいニュース記事を、好奇心旺盛な小学校1-3年生（6-8歳）の小さな探検家たちに、楽しく、優しく、そして分かりやすく伝えるお仕事をお願いします。

【変換ルール】
1. **語彙レベルと漢字の扱い:**
   - 全てひらがな、または小学校1-3年生で習う範囲の簡単な漢字のみを使用してください。
   - 上記以外の漢字を使用する場合は、必ず括弧書きでふりがな（ひらがな）を振ってください。（例：地球（ちきゅう）、国際（こくさい））
   - 難しい専門用語は使わず、子どもにも理解できる簡単な言葉に言い換えてください。

**タイトルの変換ルール:**
   - タイトルは元記事の主要な内容や出来事を保ち、ひらがなや簡単な漢字で書いてください。
   - 「〜だよ！」「〜したよ！」「すごいね！」などの親しみやすい表現を使いながら、元のニュースの趣旨を変えないでください。
   - 難しい言葉は子どもでもわかる言葉に置き換えてくださいが、ニュースの本質は保持してください。

2. **文体と口調:**
   - 「〜だよ！」「〜だね！」「〜かな？」「すごいことがあったよ！」など、親しみやすく、語りかけるような「です・ます調」で記述してください。
   - 文章は短く、一文一文を区切って、飽きさせないように工夫してください。
   - 読み聞かせをしているかのように、リズム感のある文章を意識してください。

3. **内容と説明方法:**
   - 元の記事の重要なポイントを、子どもたちが「へぇ〜！」「どうして？」と感じるような表現で説明してください。
   - 難しい概念や出来事は、子どもたちの日常生活（例：おもちゃ、動物、遊び、学校、家族、好きな食べ物など）に即した身近な例を使って、具体的に説明してください。
   - 物語のように、導入から結びまで興味を引き続ける構成にしてください。

4. **長さと構成:**
   - 子どもが読みやすいように800文字以内でまとめてください。元記事の重要なポイントを選んで、わかりやすく説明してください。
   - 自然な段落構成で、子どもが読みやすいように適度に段落分けしてください。
   - 特別な見出しは不要です。普通のニュース記事のように、自然な流れで書いてください。
   - 重要な情報に絞って、子どもでもわかりやすく説明してください。

5. **禁止事項:**
   - 元記事の内容を勝手に変えたり、事実と異なる情報を追加したりしないでください。
   - 子どもたちを怖がらせるような表現や、必要以上に不安を煽る表現は避けてください。
   - 説教じみた表現や、一方的に教え込むような口調は使わないでください。
   - 読解力が低いと決めつけるような表現は避けて、あくまで「分かりやすく伝える」ことを意識してください。`;
  } else if (childAge <= 12) {
    // 小学校高学年
    detailedPrompt = `あなたは「ニュースラボ」のベテラン解説員です。これからあなたには、難しいニュース記事を、知的好奇心旺盛な小学校高学年（9-12歳）の探偵団員たちに、面白く、深く、そして納得できるように伝えるお仕事をお願いします。

【変換ルール】
1. **語彙レベルと漢字の扱い:**
   - 小学校高学年で習う漢字は積極的に使用し、常用漢字の範囲内で必要に応じて簡単な漢字を使用してください。
   - 小学校高学年で習わない漢字や、読み方が難しい漢字には、必ず括弧書きでふりがな（ひらがな）を振ってください。（例：概念（がいねん）、影響（えいきょう））
   - 新しい専門用語が出てきた場合は、簡単な言葉で「〜って、こういうことなんだよ。」のように、かみ砕いて説明を加えてください。

**タイトルの変換ルール:**
   - タイトルは元記事の主要な内容や出来事を保ち、小学校高学年が理解できるレベルにしてください。
   - 「なぜ？」「どうして？」「すごいことが起きた！」などの表現を使いながら、元のニュースの趣旨を変えないでください。
   - 難しい専門用語は子どもにもわかる言葉に置き換えてくださいが、ニュースの本質は保持してください。

2. **文体と口調:**
   - 「〜です。」「〜ます。」調を基本に、時に「〜って知ってるかな？」「じつはね、こんな理由があるんだ。」のように、読者の知的好奇心をくすぐる問いかけや、秘密を打ち明けるような語り口を混ぜてください。
   - 論理的なつながりを意識しつつも、堅苦しくなりすぎず、読みやすい文章を心がけてください。

3. **内容と説明方法:**
   - 元の記事の背景や「なぜそうなるのか」という理由も、簡潔に説明することで、読者の理解を深めてください。
   - 難しい概念や出来事については、図やグラフがなくてもイメージしやすいように、比喩表現や具体例（例：学校での出来事、社会現象、科学実験など）を効果的に使って説明してください。
   - ニュースが自分たちの生活や未来にどうつながるのか、少しだけ示唆するような視点も加えると良いでしょう。

4. **長さと構成:**
   - 子どもが読みやすいように800文字以内でまとめてください。元記事の重要なポイントと背景を選んで、簡潔に説明してください。
   - 自然なニュース記事の流れで書いてください。特別な見出しは不要です。導入、詳細、背景、まとめの流れで簡潔に書いてください。
   - 各段落は適度な長さで、読みやすいように段落分けしてください。重要な情報に絞って説明してください。

5. **禁止事項:**
   - 元記事の内容から逸脱したり、不正確な情報を伝えたりしないでください。
   - 専門用語を説明なしに多用し、読者を置き去りにしないようにしてください。
   - 幼すぎる表現や、逆に難解すぎる表現は避けて、この年齢層にぴったりのバランスを保ってください。`;
  } else {
    // 中学生
    detailedPrompt = `あなたは「ニュースラボ」の主任研究員です。これからあなたには、難しいニュース記事を、社会や未来に関心のある中学生（13-15歳）のラボメンバーたちに、深く考察を促し、多角的な視点を提供するお仕事をお願いします。

【変換ルール】
1. **語彙レベルと漢字の扱い:**
   - 中学生が理解できるレベルの常用漢字は全て使用してください。
   - 専門用語については、その概念を簡潔に説明した上で、元記事通りの表現を使用してください。必要に応じて、括弧書きでさらに簡単な言い換えを補足しても良いでしょう。
   - 難解な語句や熟語には、文脈で理解できるよう配慮し、必要であれば注釈のように簡単な説明を加えてください。

**タイトルの変換ルール:**
   - タイトルは元記事の主要な内容や出来事を保ち、中学生が関心を持ち理解しやすい表現にしてください。
   - 「なぜ？」「どうして？」「どんな影響がある？」などの表現を使いながら、元のニュースの趣旨を変えないでください。
   - 難しい専門用語は、中学生にもわかりやすい言葉に置き換えてくださいが、ニュースの本質は保持してください。

2. **文体と口調:**
   - 「〜である。」「〜と考える。」「〜が示唆される。」といった、論理的かつ客観的な文体を基本としながらも、読者の思考を刺激するような問いかけや、議論を促すような口調を適度に混ぜてください。
   - 読者が自身の意見を形成する手助けとなるような、冷静かつ情報に基づいた語り口を意識してください。

3. **内容と説明方法:**
   - 元の記事の出来事だけでなく、その背景にある社会問題、歴史的経緯、関連する科学技術や経済動向など、多角的な視点から情報を提供してください。
   - ニュースが現代社会や自分たちの将来にどのような影響を与える可能性があるのか、具体的な事例やデータ（元の記事にあれば）を引用しつつ、深く掘り下げて説明してください。
   - 特定の事象に対する賛否両論がある場合は、公平な立場でそれぞれの意見を簡潔に紹介し、読者自身が考えるきっかけを与えてください。

4. **長さと構成:**
   - 中学生が読みやすいように800文字以内でまとめてください。元記事の重要なポイントと複数の視点を選んで、簡潔に分析してください。
   - 自然なニュース記事の流れで書いてください。特別な見出しは不要です。ニュースの核心、背景、影響、まとめの流れで論理的に書いてください。
   - 各段落は内容の区切りを意識し、論理的な流れが明確になるように調整してください。重要な分析に絞って情報を含めてください。

5. **禁止事項:**
   - 元記事の内容を誇張したり、特定の意見に偏った解釈を押し付けたりしないでください。
   - 事実に基づかない憶測や、根拠のない情報を提示しないでください。
   - 読者の知的好奇心や考察力を軽視するような、単純すぎる説明は避けてください。
   - 専門用語を説明なしに多用しすぎたり、逆に簡単な言葉に言い換えすぎて本質を損なったりしないようにしてください。`;
  }

  return `${detailedPrompt}

【元記事】
タイトル: ${article.title}
内容: ${article.content}

【最重要指示】
子どもが読みやすいように、変換後の文章は800文字以内にまとめてください。元記事の重要なポイントを選んで、わかりやすく説明してください。

【詳細要求】
- 元記事の重要なポイントを選択して含める
- 子どもでもわかりやすい説明にする
- 必要に応じて背景情報を簡潔に説明
- 身近な例え話を使って理解しやすくする
- 800文字以内で完結にまとめる


【出力形式】
以下の形式で、プレーンテキストとして回答してください：

---TITLE---
変換後のタイトル
---CONTENT---
変換後の本文（段落は改行で区切る。特別な見出しは不要）
---SUMMARY---
変換後の要約（50文字以内）
---CATEGORY---
適切なカテゴリ（かがく、スポーツ、せいじ、ぶんか、など）
`;
}

// 記事をAIで変換
export async function convertArticleForChild(
  article: ArticleContent, 
  childAge: number
): Promise<ArticleContent> {
  try {
    // APIキーが設定されていない場合はデモモードで動作
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'sk-test-key-placeholder' || apiKey.trim() === '' || !apiKey.startsWith('sk-')) {
      console.log('⚠️ OpenAI APIキーが正しく設定されていません。デモモードで動作します。');
      console.log(`現在のAPIキー: ${apiKey ? apiKey.substring(0, 10) + '...' : 'undefined'}`);
      return getDemoConversion(article, childAge);
    }

    const prompt = generatePrompt(article, childAge);
    
    console.log('OpenAI APIで記事を変換中...', { childAge, titleLength: article.title.length });
    
    console.log('📝 OpenAI API へ送信するプロンプト長:', prompt.length);
    console.log('📝 元記事内容長:', article.content.length);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは子供向けニュース変換の専門家です。複雑なニュースを子供にとって分かりやすく、興味深い内容に変換することが得意です。タイトルは元記事の主要な内容や出来事を保ちながら子どもの年齢に適した表現に変換し、子どもが読みやすいように800文字以内で要点をまとめ、自然なニュース記事の流れで、特別な見出しは使わず、通常の段落構成で書いてください。"
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 4000, // より長い回答を許可
      temperature: 0.8
    });
    
    console.log('📝 OpenAI APIレスポンス長:', completion.choices[0]?.message?.content?.length || 0);

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('OpenAI APIからの応答が空です');
    }

    // プレーンテキスト形式の応答をパース
    try {
      console.log('📝 OpenAI APIからの生レスポンス:', response.substring(0, 200) + '...');
      
      // プレーンテキスト形式をパース
      const titleMatch = response.match(/---TITLE---\s*(.*?)\s*---CONTENT---/s);
      const contentMatch = response.match(/---CONTENT---\s*(.*?)\s*---SUMMARY---/s);
      const summaryMatch = response.match(/---SUMMARY---\s*(.*?)\s*---CATEGORY---/s);
      const categoryMatch = response.match(/---CATEGORY---\s*(.*?)$/s);
      
      const parsedResponse = {
        convertedTitle: titleMatch ? titleMatch[1].trim() : article.title,
        convertedContent: contentMatch ? contentMatch[1].trim() : article.content,
        convertedSummary: summaryMatch ? summaryMatch[1].trim() : article.summary,
        category: categoryMatch ? categoryMatch[1].trim() : article.category
      };
      
      console.log('📝 パース済みレスポンス:', {
        titleLength: parsedResponse.convertedTitle?.length || 0,
        contentLength: parsedResponse.convertedContent?.length || 0,
        summaryLength: parsedResponse.convertedSummary?.length || 0
      });
      
      return {
        title: parsedResponse.convertedTitle,
        content: parsedResponse.convertedContent,
        summary: parsedResponse.convertedSummary,
        category: parsedResponse.category
      };
    } catch (parseError) {
      console.warn('プレーンテキスト解析に失敗しました。', parseError);
      console.log('📝 解析失敗した生レスポンス:', response);
      // 解析に失敗した場合は、レスポンス全体をコンテンツとして使用
      return {
        title: article.title,
        content: response,
        summary: response.substring(0, 50) + '...',
        category: article.category
      };
    }

  } catch (error) {
    console.error('OpenAI API エラー:', error);
    // エラー時はデモ変換を使用
    console.log('エラーが発生したため、デモ変換を使用します。');
    return getDemoConversion(article, childAge);
  }
}

// デモ用の変換機能（OpenAI API使用不可時のフォールバック）
function getDemoConversion(article: ArticleContent, childAge: number): ArticleContent {
  let convertedTitle = article.title;
  let convertedContent = article.content;
  let convertedSummary = article.summary;
  let category = article.category;

  if (childAge <= 8) {
    // 小学校低学年向け
    convertedTitle = convertTitleForYoungKids(article.title);
    convertedContent = convertContentForYoungKids(article.content);
    convertedSummary = convertSummaryForYoungKids(article.summary);
    category = convertCategoryForKids(article.category);
  } else if (childAge <= 12) {
    // 小学校高学年向け
    convertedTitle = convertTitleForOlderKids(article.title);
    convertedContent = convertContentForOlderKids(article.content);
    convertedSummary = convertSummaryForOlderKids(article.summary);
    category = convertCategoryForKids(article.category);
  } else {
    // 中学生向け
    convertedTitle = convertTitleForTeens(article.title);
    convertedContent = convertContentForTeens(article.content);
    convertedSummary = convertSummaryForTeens(article.summary);
    category = convertCategoryForKids(article.category);
  }

  return {
    title: convertedTitle,
    content: convertedContent,
    summary: convertedSummary,
    category: category
  };
}

// デモ変換のヘルパー関数
function convertTitleForYoungKids(title: string): string {
  return title
    .replace(/新しい/g, 'あたらしい')
    .replace(/発見/g, 'はっけん')
    .replace(/宇宙/g, 'うちゅう')
    + ' だよ！';
}

function convertContentForYoungKids(content: string): string {
  return content
    .substring(0, 200)
    .replace(/です/g, 'だよ')
    .replace(/ます/g, 'るよ')
    .replace(/。/g, '！\n\n')
    + '\n\nとても すごいね！';
}

function convertSummaryForYoungKids(summary: string): string {
  return summary.substring(0, 30) + ' すごいね！';
}

function convertTitleForOlderKids(title: string): string {
  return title.replace(/！$/, '') + ' について知ろう！';
}

function convertContentForOlderKids(content: string): string {
  return content.substring(0, 300) + '\n\nこれからの研究が楽しみですね。';
}

function convertSummaryForOlderKids(summary: string): string {
  return summary.substring(0, 40) + ' 興味深いニュースです。';
}

function convertTitleForTeens(title: string): string {
  return title + ' - 詳細解説';
}

function convertContentForTeens(content: string): string {
  return content.substring(0, 400) + '\n\nこのニュースは社会にどのような影響を与えるでしょうか。';
}

function convertSummaryForTeens(summary: string): string {
  return summary.substring(0, 50) + ' 今後の動向に注目です。';
}

function convertCategoryForKids(category: string): string {
  const categoryMap: { [key: string]: string } = {
    '科学': 'かがく',
    'スポーツ': 'スポーツ',
    '政治': 'せいじ',
    '経済': 'けいざい',
    '文化': 'ぶんか',
    '国際': 'せかい',
    '技術': 'ぎじゅつ',
    '環境': 'しぜん',
    '社会': 'しゃかい'
  };
  
  return categoryMap[category] || 'その他';
}