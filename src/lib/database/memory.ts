import { 
  DatabaseProvider, 
  Article, 
  User, 
  ArticleReaction, 
  Question, 
  DatabaseError 
} from './types';

// グローバルストレージ（シングルトンパターン）
const globalForDb = globalThis as unknown as {
  memoryProviderData: {
    articles: Map<number, Article>;
    users: Map<string, User>;
    reactions: Map<string, ArticleReaction>;
    questions: Map<string, Question>;
    nextArticleId: number;
    nextQuestionId: number;
    initialized: boolean;
  } | undefined;
};

// 既存のarticle-store.tsの機能をDatabaseProviderインターフェースに準拠させる
export class MemoryProvider implements DatabaseProvider {
  private articles: Map<number, Article>;
  private users: Map<string, User>;
  private reactions: Map<string, ArticleReaction>;
  private questions: Map<string, Question>;
  private nextArticleId: number;
  private nextQuestionId: number;

  constructor() {
    // グローバルデータが存在しない場合のみ初期化
    if (!globalForDb.memoryProviderData) {
      globalForDb.memoryProviderData = {
        articles: new Map(),
        users: new Map(),
        reactions: new Map(),
        questions: new Map(),
        nextArticleId: 1000,
        nextQuestionId: 1,
        initialized: false
      };
    }

    // グローバルデータを参照
    const data = globalForDb.memoryProviderData;
    this.articles = data.articles;
    this.users = data.users;
    this.reactions = data.reactions;
    this.questions = data.questions;
    this.nextArticleId = data.nextArticleId;
    this.nextQuestionId = data.nextQuestionId;

    // 初期化が必要な場合のみ実行
    if (!data.initialized) {
      this.initializeData();
      data.initialized = true;
    }
  }

  private initializeData() {
    // 既存のサンプルデータを初期化
    const initialArticles: Article[] = [
      {
        id: 1,
        originalUrl: "https://example.com/space-news",
        childAge: 8,
        originalTitle: "新しい宇宙探査機が火星に到達",
        convertedTitle: "うちゅうせんが かせいに たどりついたよ！",
        originalContent: "NASA の最新宇宙探査機が火星の軌道に正常に到達し...",
        convertedContent: "NASAという うちゅうの けんきゅうを している ところが つくった うちゅうせんが かせいという ほしに つきました。この うちゅうせんには すごい きかいが ついていて、かせいの いろいろなことを しらべます。むかし かせいに みずが あったかも しらべるよ！",
        convertedSummary: "うちゅうせんが かせいに いって、いろいろ しらべるよ！",
        category: "かがく",
        createdAt: "2024-09-01T10:00:00Z",
        status: "completed",
        hasRead: false,
        reactions: [],
        isArchived: false
      },
      {
        id: 2,
        originalUrl: "https://example.com/dinosaur-news",
        childAge: 8,
        originalTitle: "新しい恐竜の化石を発見",
        convertedTitle: "あたらしい きょうりゅうの ほねが みつかったよ！",
        originalContent: "古生物学者が新種の恐竜の化石を発見しました...",
        convertedContent: "がくしゃの ひとたちが、いままで みたことのない あたらしい きょうりゅうの ほねを みつけました！とても おおきくて、つよそうな きょうりゅうだったみたいです。このきょうりゅうは どんな せいかつを していたのかな？",
        convertedSummary: "あたらしい きょうりゅうの ほねが みつかって、がくしゃの ひとが しらべているよ！",
        category: "かがく",
        createdAt: "2024-08-30T15:30:00Z",
        status: "completed",
        hasRead: true,
        reactions: ["good"],
        isArchived: false
      },
      {
        id: 3,
        originalUrl: "https://example.com/olympics-news",
        childAge: 8,
        originalTitle: "東京オリンピックの振り返り",
        convertedTitle: "オリンピックの おもいで",
        originalContent: "東京オリンピックが成功裏に終了し...",
        convertedContent: "とうきょうで オリンピックが ありました！せかいじゅうから たくさんの せんしゅが きて、いろいろな スポーツを しました。にっぽんの せんしゅも がんばって、きんメダルを たくさん とりました！みんなで おうえんして、とても たのしかったね。",
        convertedSummary: "とうきょうオリンピックで せんしゅたちが がんばりました！",
        category: "スポーツ",
        createdAt: "2024-08-28T12:00:00Z",
        status: "completed",
        hasRead: true,
        reactions: ["good", "fun"],
        isArchived: false
      }
    ];

    initialArticles.forEach(article => {
      this.articles.set(article.id, article);
      if (article.id >= this.nextArticleId) {
        this.nextArticleId = article.id + 1;
        // グローバルデータにも反映
        if (globalForDb.memoryProviderData) {
          globalForDb.memoryProviderData.nextArticleId = this.nextArticleId;
        }
      }
    });

    console.log(`🔧 MemoryProvider初期化完了: ${this.articles.size}件の記事を設定`);
    console.log(`📋 記事一覧:`, Array.from(this.articles.keys()));
  }

  async testConnection(): Promise<boolean> {
    return true; // メモリプロバイダーは常に接続可能
  }

  // 記事操作
  async getArticles(filters?: {
    userId?: string;
    category?: string;
    isArchived?: boolean;
    limit?: number;
  }): Promise<Article[]> {
    console.log(`🔍 getArticles呼び出し: ${this.articles.size}件の記事が存在`);
    console.log(`📋 現在の記事ID:`, Array.from(this.articles.keys()));
    let articles = Array.from(this.articles.values());

    // フィルタリング
    if (filters?.category && filters.category !== 'all') {
      articles = articles.filter(article => article.category === filters.category);
    }

    if (filters?.isArchived !== undefined) {
      articles = articles.filter(article => article.isArchived === filters.isArchived);
    }

    // ソート（新しい順）
    articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 件数制限
    if (filters?.limit) {
      articles = articles.slice(0, filters.limit);
    }

    return articles;
  }

  async getArticleById(id: number): Promise<Article | null> {
    return this.articles.get(id) || null;
  }

  async createArticle(article: Omit<Article, 'id' | 'createdAt'>): Promise<Article> {
    console.log(`🔥 createArticle呼び出し開始`);
    console.log(`🔥 入力記事:`, { 
      title: article.convertedTitle?.substring(0, 50),
      category: article.category 
    });
    console.log(`🔥 現在の記事数: ${this.articles.size}件`);
    console.log(`🔥 次のID: ${this.nextArticleId}`);
    
    const newArticle: Article = {
      ...article,
      id: this.nextArticleId,
      createdAt: new Date().toISOString()
    };

    // IDをインクリメントしてグローバルデータにも反映
    this.nextArticleId++;
    if (globalForDb.memoryProviderData) {
      globalForDb.memoryProviderData.nextArticleId = this.nextArticleId;
      console.log(`🔥 グローバルnextArticleIdを更新: ${this.nextArticleId}`);
    } else {
      console.error(`🚨 グローバルデータが存在しません！`);
    }

    this.articles.set(newArticle.id, newArticle);
    console.log(`🔥 記事を保存完了: ID=${newArticle.id}, タイトル=${newArticle.convertedTitle.substring(0, 30)}...`);
    console.log(`🔥 保存後の記事数: ${this.articles.size}件`);
    console.log(`🔥 保存後のID一覧:`, Array.from(this.articles.keys()));
    
    // グローバルデータの整合性チェック
    if (globalForDb.memoryProviderData) {
      console.log(`🔥 グローバル記事数: ${globalForDb.memoryProviderData.articles.size}件`);
    }
    
    return newArticle;
  }

  async updateArticle(id: number, updates: Partial<Article>): Promise<Article | null> {
    const article = this.articles.get(id);
    if (!article) return null;

    const updatedArticle = { ...article, ...updates };
    this.articles.set(id, updatedArticle);
    return updatedArticle;
  }

  async deleteArticle(id: number): Promise<boolean> {
    return this.articles.delete(id);
  }

  // ユーザー操作
  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async createUser(user: Omit<User, 'createdAt' | 'lastLoginAt'>): Promise<User> {
    const newUser: User = {
      ...user,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // リアクション操作
  async addReaction(articleId: number, userId: string, reaction: string): Promise<boolean> {
    const article = this.articles.get(articleId);
    if (!article) return false;

    // 重複チェック
    if (!article.reactions.includes(reaction)) {
      article.reactions.push(reaction);
      
      // 個別のリアクションレコードも作成
      const reactionId = `${articleId}-${userId}-${reaction}`;
      const reactionRecord: ArticleReaction = {
        id: reactionId,
        articleId,
        userId,
        reaction,
        createdAt: new Date().toISOString()
      };
      this.reactions.set(reactionId, reactionRecord);
      
      console.log(`👍 リアクション追加: 記事${articleId} -> ${reaction} (ユーザー: ${userId})`);
    }

    return true;
  }

  async removeReaction(articleId: number, userId: string, reaction: string): Promise<boolean> {
    const article = this.articles.get(articleId);
    if (!article) return false;

    // 記事からリアクションを削除
    article.reactions = article.reactions.filter(r => r !== reaction);

    // 個別のリアクションレコードも削除
    const reactionId = `${articleId}-${userId}-${reaction}`;
    this.reactions.delete(reactionId);

    return true;
  }

  async getReactions(articleId: number, userId?: string): Promise<ArticleReaction[]> {
    const reactions = Array.from(this.reactions.values()).filter(reaction => {
      if (reaction.articleId !== articleId) return false;
      if (userId && reaction.userId !== userId) return false;
      return true;
    });

    return reactions;
  }

  // 質問操作
  async createQuestion(question: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
    const newQuestion: Question = {
      ...question,
      id: `question-${this.nextQuestionId++}`,
      createdAt: new Date().toISOString()
    };

    this.questions.set(newQuestion.id, newQuestion);
    return newQuestion;
  }

  async getQuestions(articleId: number, userId?: string): Promise<Question[]> {
    const questions = Array.from(this.questions.values()).filter(question => {
      if (question.articleId !== articleId) return false;
      if (userId && question.userId !== userId) return false;
      return true;
    });

    return questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async answerQuestion(id: string, answer: string): Promise<Question | null> {
    const question = this.questions.get(id);
    if (!question) return null;

    const updatedQuestion: Question = {
      ...question,
      parentAnswer: answer,
      status: 'answered',
      answeredAt: new Date().toISOString()
    };

    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }

  // 統計・管理
  async getStats(userId?: string): Promise<{
    totalArticles: number;
    readArticles: number;
    readingRate: number;
    categoryCounts: { [key: string]: number };
  }> {
    const articles = Array.from(this.articles.values()).filter(a => !a.isArchived);
    const readArticles = articles.filter(a => a.hasRead);

    const categoryCounts: { [key: string]: number } = {};
    articles.forEach(article => {
      categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
    });

    return {
      totalArticles: articles.length,
      readArticles: readArticles.length,
      readingRate: articles.length > 0 ? Math.round((readArticles.length / articles.length) * 100) : 0,
      categoryCounts
    };
  }
}