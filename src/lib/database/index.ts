import { DatabaseProvider, DatabaseConfig, DatabaseError } from './types';
import { SupabaseProvider } from './supabase';
import { MemoryProvider } from './memory';

class DatabaseManager {
  private provider: DatabaseProvider;
  private config: DatabaseConfig;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      provider: 'memory', // デフォルトはメモリプロバイダー
      ...config
    };

    this.provider = this.createProvider();
  }

  private createProvider(): DatabaseProvider {
    switch (this.config.provider) {
      case 'supabase':
        if (!this.config.supabase?.url || !this.config.supabase?.anonKey) {
          console.warn('🚨 Supabase設定が不完全です。メモリプロバイダーにフォールバックします。');
          return new MemoryProvider();
        }
        
        try {
          const supabaseProvider = new SupabaseProvider(
            this.config.supabase.url, 
            this.config.supabase.anonKey
          );
          console.log('📊 Supabaseプロバイダーを初期化しました');
          return supabaseProvider;
        } catch (error) {
          console.error('🚨 Supabaseプロバイダーの初期化に失敗しました:', error);
          console.log('📝 メモリプロバイダーにフォールバックします');
          return new MemoryProvider();
        }

      case 'memory':
      default:
        console.log('📝 メモリプロバイダーを使用します');
        return new MemoryProvider();
    }
  }

  // プロバイダーの動的切り替え（開発・デバッグ用）
  switchProvider(config: Partial<DatabaseConfig>): void {
    this.config = { ...this.config, ...config };
    this.provider = this.createProvider();
  }

  // プロバイダーのヘルスチェック
  async healthCheck(): Promise<{
    provider: string;
    healthy: boolean;
    error?: string;
  }> {
    try {
      const healthy = await this.provider.testConnection();
      return {
        provider: this.config.provider,
        healthy,
        error: healthy ? undefined : 'Connection test failed'
      };
    } catch (error) {
      return {
        provider: this.config.provider,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // DatabaseProviderのメソッドを代理
  async getArticles(filters?: {
    userId?: string;
    category?: string;
    isArchived?: boolean;
    limit?: number;
  }) {
    return this.provider.getArticles(filters);
  }

  async getArticleById(id: number) {
    return this.provider.getArticleById(id);
  }

  async createArticle(article: Parameters<DatabaseProvider['createArticle']>[0]) {
    return this.provider.createArticle(article);
  }

  async updateArticle(id: number, updates: Parameters<DatabaseProvider['updateArticle']>[1]) {
    return this.provider.updateArticle(id, updates);
  }

  async deleteArticle(id: number) {
    return this.provider.deleteArticle(id);
  }

  async getUser(id: string) {
    return this.provider.getUser(id);
  }

  async createUser(user: Parameters<DatabaseProvider['createUser']>[0]) {
    return this.provider.createUser(user);
  }

  async updateUser(id: string, updates: Parameters<DatabaseProvider['updateUser']>[1]) {
    return this.provider.updateUser(id, updates);
  }

  async addReaction(articleId: number, userId: string, reaction: string) {
    return this.provider.addReaction(articleId, userId, reaction);
  }

  async removeReaction(articleId: number, userId: string, reaction: string) {
    return this.provider.removeReaction(articleId, userId, reaction);
  }

  async getReactions(articleId: number, userId?: string) {
    return this.provider.getReactions(articleId, userId);
  }

  async createQuestion(question: Parameters<DatabaseProvider['createQuestion']>[0]) {
    return this.provider.createQuestion(question);
  }

  async getQuestions(articleId: number, userId?: string) {
    return this.provider.getQuestions(articleId, userId);
  }

  async answerQuestion(id: string, answer: string) {
    return this.provider.answerQuestion(id, answer);
  }

  async getStats(userId?: string) {
    return this.provider.getStats(userId);
  }

  async testConnection() {
    return this.provider.testConnection();
  }
}

// グローバルインスタンス（シングルトン）
let databaseInstance: DatabaseManager | null = null;

// 環境変数からの設定読み込み
function getConfigFromEnv(): DatabaseConfig {
  // フィーチャーフラグチェック
  const useDatabase = process.env.NEXT_PUBLIC_USE_DATABASE === 'true';
  
  if (!useDatabase) {
    return { provider: 'memory' };
  }

  // Supabase設定
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    return {
      provider: 'supabase',
      supabase: {
        url: supabaseUrl,
        anonKey: supabaseAnonKey
      }
    };
  }

  console.warn('🔧 データベース有効化が指定されていますが、Supabase設定が見つかりません。メモリプロバイダーを使用します。');
  return { provider: 'memory' };
}

// データベースインスタンス取得
export function getDatabase(): DatabaseManager {
  if (!databaseInstance) {
    const config = getConfigFromEnv();
    databaseInstance = new DatabaseManager(config);
  }
  return databaseInstance;
}

// 開発・テスト用：データベースプロバイダーの強制切り替え
export function setDatabaseProvider(config: Partial<DatabaseConfig>): void {
  if (databaseInstance) {
    databaseInstance.switchProvider(config);
  } else {
    databaseInstance = new DatabaseManager(config);
  }
}

// データベースのヘルスチェック
export async function checkDatabaseHealth() {
  const db = getDatabase();
  return db.healthCheck();
}

// 型の再エクスポート
export type { 
  DatabaseProvider, 
  Article, 
  User, 
  ArticleReaction, 
  Question, 
  DatabaseConfig 
} from './types';

export { DatabaseError } from './types';

// デフォルトエクスポート
export default getDatabase;