// データベース共通型定義

export interface Article {
  id: number;
  originalUrl: string;
  childAge: number;
  originalTitle: string;
  convertedTitle: string;
  originalContent: string;
  convertedContent: string;
  convertedSummary: string;
  category: string;
  createdAt: string;
  status: string;
  siteName?: string;
  image?: string;
  hasRead: boolean;
  reactions: string[];
  isArchived: boolean;
  archivedAt?: string;
}

export interface User {
  id: string;
  email?: string;
  userType: 'child' | 'parent';
  displayName?: string;
  childAge?: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface ArticleReaction {
  id: string;
  articleId: number;
  userId: string;
  reaction: string;
  createdAt: string;
}

export interface Question {
  id: string;
  articleId: number;
  userId: string;
  question: string;
  parentAnswer?: string;
  status: 'pending' | 'answered';
  createdAt: string;
  answeredAt?: string;
}

// データベース操作インターフェース
export interface DatabaseProvider {
  // 記事操作
  getArticles(filters?: {
    userId?: string;
    category?: string;
    isArchived?: boolean;
    limit?: number;
  }): Promise<Article[]>;
  
  getArticleById(id: number): Promise<Article | null>;
  
  createArticle(article: Omit<Article, 'id' | 'createdAt'>): Promise<Article>;
  
  updateArticle(id: number, updates: Partial<Article>): Promise<Article | null>;
  
  deleteArticle(id: number): Promise<boolean>;
  
  // ユーザー操作
  getUser(id: string): Promise<User | null>;
  
  createUser(user: Omit<User, 'createdAt' | 'lastLoginAt'>): Promise<User>;
  
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  
  // リアクション操作
  addReaction(articleId: number, userId: string, reaction: string): Promise<boolean>;
  
  removeReaction(articleId: number, userId: string, reaction: string): Promise<boolean>;
  
  getReactions(articleId: number, userId?: string): Promise<ArticleReaction[]>;
  
  // 質問操作
  createQuestion(question: Omit<Question, 'id' | 'createdAt'>): Promise<Question>;
  
  getQuestions(articleId: number, userId?: string): Promise<Question[]>;
  
  answerQuestion(id: string, answer: string): Promise<Question | null>;
  
  // 統計・管理
  getStats(userId?: string): Promise<{
    totalArticles: number;
    readArticles: number;
    readingRate: number;
    categoryCounts: { [key: string]: number };
  }>;
  
  // 接続テスト
  testConnection(): Promise<boolean>;
}

// フィーチャーフラグ用の設定
export interface DatabaseConfig {
  provider: 'supabase' | 'memory';
  supabase?: {
    url: string;
    anonKey: string;
  };
}

// エラー型
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}