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
    invitations: Map<string, any>;
    organizations: Map<string, any>;
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
  private invitations: Map<string, any>;
  private organizations: Map<string, any>;
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
        invitations: new Map(),
        organizations: new Map(),
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
    this.invitations = data.invitations;
    this.organizations = data.organizations;
    this.nextArticleId = data.nextArticleId;
    this.nextQuestionId = data.nextQuestionId;

    // 初期データの投入（初回のみ）
    if (!data.initialized) {
      this.initializeMultiTenantData();
      this.initializeData();  // マルチテナントデータと記事データ両方を初期化
      data.initialized = true;
    }
  }

  private initializeMultiTenantData() {
    // マルチテナント用の初期データセットアップ
    console.log('🏗️  マルチテナント初期データを設定中...');

    // マスターユーザーの作成
    const masterUser: User = {
      id: 'master-1',
      email: 'master@know-news.com',
      displayName: 'マスター管理者',
      userType: 'master',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      createdBy: 'system'
    };
    this.users.set(masterUser.id, masterUser);

    // サンプル親ユーザー
    const sampleParents: User[] = [
      {
        id: 'parent-1',
        email: 'parent1@example.com',
        displayName: '田中太郎',
        userType: 'parent',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1週間前
        lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1日前
        createdBy: 'master-1'
      },
      {
        id: 'parent-2', 
        email: 'parent2@example.com',
        displayName: '佐藤花子',
        userType: 'parent',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5日前
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2日前
        createdBy: 'master-1'
      },
      {
        id: 'parent-3',
        email: 'parent3@example.com', 
        displayName: '鈴木一郎',
        userType: 'parent',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: false, // 非アクティブ
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日前
        lastLoginAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15日前
        createdBy: 'master-1'
      },
      // 新しいテスト親アカウント
      {
        id: 'test-parent-1',
        email: 'testparent1@example.com',
        displayName: 'テスト親1',
        userType: 'parent',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        createdBy: 'master-1'
      },
      {
        id: 'test-parent-2',
        email: 'testparent2@example.com',
        displayName: 'テスト親2',
        userType: 'parent',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        createdBy: 'master-1'
      },
      // Y387DTQL専用親アカウント
      {
        id: 'user-1762608549516',
        email: 'hiroki.fukushima@gmail.com',
        displayName: 'Y387DTQL',
        userType: 'parent',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        createdBy: 'master-1'
      }
    ];

    // サンプル子ユーザー
    const sampleChildren: User[] = [
      {
        id: 'child-1',
        email: 'tanaka-taro@example.com',
        displayName: '田中太郎 - 息子くん',
        userType: 'child',
        parentId: 'parent-1',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'parent-1'
      },
      {
        id: 'child-2',
        email: 'tanaka-hanako@example.com',
        displayName: '田中太郎 - 娘ちゃん',
        userType: 'child',
        parentId: 'parent-1',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'parent-1'
      },
      {
        id: 'child-3',
        email: 'sato-koichi@example.com',
        displayName: '佐藤花子 - 幸一くん',
        userType: 'child',
        parentId: 'parent-2',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'parent-2'
      },
      // 新しいテスト親アカウントの子アカウント
      {
        id: 'test-child-1',
        email: 'testchild1@example.com',
        displayName: 'テスト親1 - 子供ちゃん',
        userType: 'child',
        parentId: 'test-parent-1',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        createdBy: 'test-parent-1'
      },
      {
        id: 'test-child-2',
        email: 'testchild2@example.com',
        displayName: 'テスト親2 - 息子くん',
        userType: 'child',
        parentId: 'test-parent-2',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        createdBy: 'test-parent-2'
      },
      // Y387DTQL専用子アカウント
      {
        id: 'child-1762587382839-ub62wtn6d',
        email: 'y387dtql-taro@temp.local',
        displayName: 'Y387DTQL太郎',
        userType: 'child',
        parentId: 'user-1762608549516',
        masterId: 'master-1',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        createdBy: 'user-1762608549516',
        childAge: 8
      }
    ];

    // ユーザーデータを保存
    [...sampleParents, ...sampleChildren].forEach(user => {
      this.users.set(user.id, user);
    });

    // サンプル招待データ
    const sampleInvitations = [
      {
        id: 'inv-1',
        email: 'newparent@example.com',
        inviterType: 'master',
        inviterId: 'master-1',
        targetType: 'parent',
        organizationId: 'org-1',
        status: 'pending',
        code: 'ABC12345',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'inv-2',
        email: 'child1@example.com',
        inviterType: 'parent',
        inviterId: 'parent-1',
        targetType: 'child',
        parentId: 'parent-1',
        status: 'pending',
        code: 'DEF678',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      // Y387DTQL専用招待コード（永続化）
      {
        id: 'inv-y387dtql',
        email: 'hiroki.fukushima@gmail.com',
        inviterType: 'master',
        inviterId: 'master-1',
        targetType: 'parent',
        organizationId: 'org-1',
        status: 'accepted',
        code: 'Y387DTQL',
        acceptedBy: 'user-1762608549516',
        acceptedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年間有効
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // サンプル組織データ
    const sampleOrganizations = [
      {
        id: 'org-1',
        name: 'ファミリー学習グループ',
        masterId: 'master-1',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'org-2',
        name: '学習サポートセンター',
        masterId: 'master-1',
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // 招待データを保存
    sampleInvitations.forEach(invitation => {
      this.invitations.set(invitation.id, invitation);
    });

    // 組織データを保存
    sampleOrganizations.forEach(org => {
      this.organizations.set(org.id, org);
    });

    console.log(`👑 マスターユーザー: 1名作成`);
    console.log(`👨‍👩‍👧‍👦 親アカウント: ${sampleParents.length}名作成`);
    console.log(`🧒 子アカウント: ${sampleChildren.length}名作成`);
    console.log(`📨 サンプル招待: ${sampleInvitations.length}件作成`);
    console.log(`🏢 サンプル組織: ${sampleOrganizations.length}件作成`);
  }

  private initializeData() {
    // 既存のサンプルデータを初期化
    const initialArticles: Article[] = [
      {
        id: 1,
        originalUrl: "https://example.com/space-news",
        parentId: "parent-1",  // 田中太郎の記事
        organizationId: "org-1",
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
        parentId: "parent-1",  // 田中太郎の記事
        organizationId: "org-1",
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
        parentId: "parent-2",  // 佐藤花子の記事
        organizationId: "org-1",
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
    parentId?: string;  // 親アカウントでフィルタリング
    category?: string;
    isArchived?: boolean;
    limit?: number;
  }): Promise<Article[]> {
    console.log(`🔍 getArticles呼び出し: ${this.articles.size}件の記事が存在`);
    console.log(`📋 現在の記事ID:`, Array.from(this.articles.keys()));
    console.log(`🏠 フィルター条件: parentId=${filters?.parentId || 'なし'}`);
    let articles = Array.from(this.articles.values());

    // 親アカウントでのフィルタリング（最重要）
    if (filters?.parentId) {
      console.log(`🚨 親ID「${filters.parentId}」で記事をフィルタリング開始`);
      const originalCount = articles.length;
      articles = articles.filter(article => article.parentId === filters.parentId);
      console.log(`🚨 フィルタリング結果: ${originalCount}件 → ${articles.length}件`);
      
      // デバッグ: フィルタリング前後の記事詳細
      if (articles.length === 0) {
        console.log(`⚠️  フィルター後の記事が0件です。全記事のparentIdを確認:`);
        Array.from(this.articles.values()).forEach(a => {
          console.log(`   記事${a.id}: parentId=${a.parentId || '未設定'}, タイトル=${a.convertedTitle?.substring(0, 30) || 'タイトル未設定'}`);
        });
      }
    }

    // その他のフィルタリング
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

  // 新しいマルチテナント対応メソッド
  async getUsers(filters?: {
    userType?: 'master' | 'parent' | 'child';
    parentId?: string;
    masterId?: string;
    organizationId?: string;
    isActive?: boolean;
  }): Promise<User[]> {
    let users = Array.from(this.users.values());
    
    if (filters) {
      if (filters.userType) {
        users = users.filter(u => u.userType === filters.userType);
      }
      if (filters.parentId) {
        users = users.filter(u => u.parentId === filters.parentId);
      }
      if (filters.masterId) {
        users = users.filter(u => u.masterId === filters.masterId);
      }
      if (filters.organizationId) {
        users = users.filter(u => u.organizationId === filters.organizationId);
      }
      if (filters.isActive !== undefined) {
        users = users.filter(u => u.isActive === filters.isActive);
      }
    }
    
    return users;
  }

  async deactivateUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    const updatedUser = { ...user, isActive: false };
    this.users.set(id, updatedUser);
    return true;
  }

  // 組織管理の拡張（メモリ内での実装）

  async getOrganization(id: string): Promise<any | null> {
    return this.organizations.get(id) || null;
  }

  async getOrganizations(filters?: { 
    masterId?: string; 
    isActive?: boolean 
  }): Promise<any[]> {
    let orgs = Array.from(this.organizations.values());
    
    if (filters) {
      if (filters.masterId) {
        orgs = orgs.filter(o => o.masterId === filters.masterId);
      }
      if (filters.isActive !== undefined) {
        orgs = orgs.filter(o => o.isActive === filters.isActive);
      }
    }
    
    // 作成日時の降順でソート
    return orgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createOrganization(org: any): Promise<any> {
    const newOrg = {
      ...org,
      id: `org-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // メモリに保存
    this.organizations.set(newOrg.id, newOrg);
    
    return newOrg;
  }

  async updateOrganization(id: string, updates: any): Promise<any | null> {
    const org = this.organizations.get(id);
    if (!org) return null;
    
    const updatedOrg = {
      ...org,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }

  async deactivateOrganization(id: string): Promise<boolean> {
    const org = this.organizations.get(id);
    if (!org) return false;
    
    const updatedOrg = {
      ...org,
      isActive: false,
      updatedAt: new Date().toISOString()
    };
    
    this.organizations.set(id, updatedOrg);
    return true;
  }

  // 招待機能（メモリ内での簡易実装）
  async createInvitation(invitation: any): Promise<any> {
    const newInvitation = {
      ...invitation,
      id: `inv-${Date.now()}`,
      code: this.generateInvitationCode(),
      createdAt: new Date().toISOString()
    };
    
    // メモリに保存
    this.invitations.set(newInvitation.id, newInvitation);
    
    return newInvitation;
  }

  async getInvitation(code: string): Promise<any | null> {
    const invitations = Array.from(this.invitations.values());
    return invitations.find(inv => inv.code === code) || null;
  }

  async deleteInvitation(id: string): Promise<boolean> {
    return this.invitations.delete(id);
  }

  async updateInvitation(id: string, updates: any): Promise<any | null> {
    const invitation = this.invitations.get(id);
    if (!invitation) return null;
    
    const updatedInvitation = {
      ...invitation,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.invitations.set(id, updatedInvitation);
    return updatedInvitation;
  }


  async getInvitations(filters?: {
    inviterId?: string;
    inviterType?: 'master' | 'parent';
    targetType?: 'parent' | 'child';
    status?: 'pending' | 'accepted' | 'expired';
  }): Promise<any[]> {
    let invitations = Array.from(this.invitations.values());
    
    if (filters) {
      if (filters.inviterId) {
        invitations = invitations.filter(i => i.inviterId === filters.inviterId);
      }
      if (filters.inviterType) {
        invitations = invitations.filter(i => i.inviterType === filters.inviterType);
      }
      if (filters.targetType) {
        invitations = invitations.filter(i => i.targetType === filters.targetType);
      }
      if (filters.status) {
        invitations = invitations.filter(i => i.status === filters.status);
      }
    }
    
    // 作成日時の降順でソート
    return invitations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async acceptInvitation(code: string, userId: string): Promise<boolean> {
    const invitation = await this.getInvitation(code);
    if (!invitation) return false;
    
    if (invitation.status !== 'pending') return false;
    
    // 期限チェック
    if (new Date() > new Date(invitation.expiresAt)) {
      await this.updateInvitation(invitation.id, { status: 'expired' });
      return false;
    }
    
    // 招待を承認済みに更新
    await this.updateInvitation(invitation.id, { 
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: new Date().toISOString()
    });
    
    console.log(`📨✅ 招待を承認: ${invitation.email} -> ${userId}`);
    return true;
  }

  async expireInvitation(code: string): Promise<boolean> {
    const invitation = await this.getInvitation(code);
    if (!invitation) return false;
    
    await this.updateInvitation(invitation.id, { status: 'expired' });
    console.log(`📨⏰ 招待を期限切れに設定: ${invitation.email}`);
    return true;
  }

  async extendInvitation(id: string, newExpiryDate: string): Promise<boolean> {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== 'pending') return false;
    
    await this.updateInvitation(id, { 
      expiresAt: newExpiryDate,
      status: 'pending' // 期限切れから戻すため
    });
    
    console.log(`📨📅 招待期限を延長: ${invitation.email} -> ${newExpiryDate}`);
    return true;
  }

  // 期限切れ招待の自動更新
  async updateExpiredInvitations(): Promise<number> {
    const now = new Date();
    const invitations = Array.from(this.invitations.values());
    let expiredCount = 0;
    
    for (const invitation of invitations) {
      if (invitation.status === 'pending' && new Date(invitation.expiresAt) < now) {
        await this.updateInvitation(invitation.id, { status: 'expired' });
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`📨⏰ ${expiredCount}件の招待を期限切れに更新`);
    }
    
    return expiredCount;
  }

  private generateInvitationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

  // 統計・管理（マルチテナント対応）
  async getStats(filters?: {
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
  }> {
    let articles = Array.from(this.articles.values()).filter(a => !a.isArchived);
    
    // 親アカウントでフィルタリング
    if (filters?.parentId) {
      console.log(`📊 統計計算: 親ID「${filters.parentId}」でフィルタリング`);
      articles = articles.filter(a => a.parentId === filters.parentId);
    }
    
    const readArticles = articles.filter(a => a.hasRead);

    const categoryCounts: { [key: string]: number } = {};
    articles.forEach(article => {
      categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
    });

    // ユーザー統計も追加
    const allUsers = Array.from(this.users.values());
    const parents = allUsers.filter(u => u.userType === 'parent');
    const children = allUsers.filter(u => u.userType === 'child');
    const activeUsers = allUsers.filter(u => u.isActive !== false);

    return {
      totalArticles: articles.length,
      readArticles: readArticles.length,
      readingRate: articles.length > 0 ? Math.round((readArticles.length / articles.length) * 100) : 0,
      categoryCounts,
      userCounts: {
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        parents: parents.length,
        children: children.length
      }
    };
  }
}