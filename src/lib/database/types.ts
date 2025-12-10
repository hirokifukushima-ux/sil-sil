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
  parentId?: string; // どの親アカウントで作成されたか
  organizationId?: string; // 組織ID
}

export interface User {
  id: string;
  email?: string;
  userType: 'master' | 'parent' | 'child';
  displayName?: string;
  childAge?: number;
  parentId?: string; // 子アカウントの場合、所属する親のID
  masterId?: string; // 親アカウントの場合、所属するマスターのID
  organizationId?: string; // 組織ID（オプション）
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
  createdBy?: string; // 作成者のユーザーID
}

export interface Organization {
  id: string;
  name: string;
  masterId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  inviterType: 'master' | 'parent';
  inviterId: string;
  targetType: 'parent' | 'child';
  organizationId?: string;
  parentId?: string;
  status: 'pending' | 'accepted' | 'expired';
  code: string; // 招待コード
  type: 'public' | 'private'; // public: 再利用可能, private: 1回限り
  expiresAt: string;
  createdAt: string;
  acceptedUserId?: string; // この招待を受け入れたユーザーのID
  acceptedAt?: string; // 受け入れ日時
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
    parentId?: string;
    organizationId?: string;
  }): Promise<Article[]>;
  
  getArticleById(id: number): Promise<Article | null>;
  
  createArticle(article: Omit<Article, 'id' | 'createdAt'>): Promise<Article>;
  
  updateArticle(id: number, updates: Partial<Article>): Promise<Article | null>;
  
  deleteArticle(id: number): Promise<boolean>;
  
  // ユーザー操作
  getUser(id: string): Promise<User | null>;
  
  getUsers(filters?: {
    userType?: 'master' | 'parent' | 'child';
    parentId?: string;
    masterId?: string;
    organizationId?: string;
    isActive?: boolean;
  }): Promise<User[]>;
  
  createUser(user: Omit<User, 'createdAt' | 'lastLoginAt'>): Promise<User>;
  
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  
  deactivateUser(id: string): Promise<boolean>;
  
  // 組織操作
  getOrganization(id: string): Promise<Organization | null>;
  
  getOrganizations(filters?: {
    masterId?: string;
    isActive?: boolean;
  }): Promise<Organization[]>;
  
  createOrganization(org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization>;
  
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null>;
  
  // 招待機能
  createInvitation(invitation: Omit<Invitation, 'id' | 'createdAt' | 'code'>): Promise<Invitation>;

  getInvitation(code: string): Promise<Invitation | null>;

  getInvitations(filters?: {
    inviterId?: string;
    status?: 'pending' | 'accepted' | 'expired';
  }): Promise<Invitation[]>;

  updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | null>;

  acceptInvitation(code: string, userId: string): Promise<boolean>;

  expireInvitation(code: string): Promise<boolean>;
  
  // リアクション操作
  addReaction(articleId: number, userId: string, reaction: string): Promise<boolean>;
  
  removeReaction(articleId: number, userId: string, reaction: string): Promise<boolean>;
  
  getReactions(articleId: number, userId?: string): Promise<ArticleReaction[]>;
  
  // 質問操作
  createQuestion(question: Omit<Question, 'id' | 'createdAt'>): Promise<Question>;
  
  getQuestions(articleId: number, userId?: string): Promise<Question[]>;
  
  answerQuestion(id: string, answer: string): Promise<Question | null>;
  
  // 統計・管理
  getStats(filters?: {
    userId?: string;
    parentId?: string;
    organizationId?: string;
  }): Promise<{
    totalArticles: number;
    readArticles: number;
    readingRate: number;
    categoryCounts: { [key: string]: number };
    userCounts?: {
      totalUsers: number;
      activeUsers: number;
      parents: number;
      children: number;
    };
  }>;
  
  // 接続テスト
  testConnection(): Promise<boolean>;

  // トークン使用量管理
  getUserTokenUsage(userId: string): Promise<{
    totalTokensUsed: number;
    tokenLimit: number;
    tokensResetAt: Date;
  }>;
  updateUserTokenUsage(userId: string, tokensUsed: number): Promise<void>;
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