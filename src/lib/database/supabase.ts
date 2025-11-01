import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  DatabaseProvider, 
  Article, 
  User, 
  ArticleReaction, 
  Question, 
  DatabaseError 
} from './types';

export class SupabaseProvider implements DatabaseProvider {
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client.from('articles').select('count', { count: 'exact', head: true });
      return !error;
    } catch (error) {
      console.error('Supabase接続テストエラー:', error);
      return false;
    }
  }

  // 記事操作
  async getArticles(filters?: {
    userId?: string;
    category?: string;
    isArchived?: boolean;
    limit?: number;
  }): Promise<Article[]> {
    try {
      let query = this.client.from('articles').select('*');

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.isArchived !== undefined) {
        query = query.eq('is_archived', filters.isArchived);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new DatabaseError(`記事取得エラー: ${error.message}`, error.code);
      }

      return data?.map(this.transformArticleFromDB) || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('記事取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async getArticleById(id: number): Promise<Article | null> {
    try {
      const { data, error } = await this.client
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`記事取得エラー: ${error.message}`, error.code);
      }

      return data ? this.transformArticleFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('記事取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async createArticle(article: Omit<Article, 'id' | 'createdAt'>): Promise<Article> {
    try {
      const { data, error } = await this.client
        .from('articles')
        .insert([this.transformArticleToDB(article)])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`記事作成エラー: ${error.message}`, error.code);
      }

      return this.transformArticleFromDB(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('記事作成中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async updateArticle(id: number, updates: Partial<Article>): Promise<Article | null> {
    try {
      const { data, error } = await this.client
        .from('articles')
        .update(this.transformArticleToDB(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`記事更新エラー: ${error.message}`, error.code);
      }

      return data ? this.transformArticleFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('記事更新中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async deleteArticle(id: number): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseError(`記事削除エラー: ${error.message}`, error.code);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      return false;
    }
  }

  // ユーザー操作
  async getUser(id: string): Promise<User | null> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`ユーザー取得エラー: ${error.message}`, error.code);
      }

      return data ? this.transformUserFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('ユーザー取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async createUser(user: Omit<User, 'createdAt' | 'lastLoginAt'>): Promise<User> {
    try {
      const { data, error } = await this.client
        .from('users')
        .insert([this.transformUserToDB(user)])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`ユーザー作成エラー: ${error.message}`, error.code);
      }

      return this.transformUserFromDB(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('ユーザー作成中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const { data, error } = await this.client
        .from('users')
        .update(this.transformUserToDB(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`ユーザー更新エラー: ${error.message}`, error.code);
      }

      return data ? this.transformUserFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('ユーザー更新中に予期しないエラーが発生しました', undefined, error);
    }
  }

  // リアクション操作
  async addReaction(articleId: number, userId: string, reaction: string): Promise<boolean> {
    try {
      // まず既存のリアクションをチェック
      const { data: existingReaction } = await this.client
        .from('article_reactions')
        .select('*')
        .eq('article_id', articleId)
        .eq('user_id', userId)
        .eq('reaction', reaction)
        .single();

      // 既に存在する場合は成功として返す
      if (existingReaction) {
        return true;
      }

      // 存在しない場合は新規追加
      const { error } = await this.client
        .from('article_reactions')
        .insert([{
          article_id: articleId,
          user_id: userId,
          reaction,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        // 重複エラーの場合は成功として扱う
        if (error.code === '23505') {
          return true;
        }
        throw new DatabaseError(`リアクション追加エラー: ${error.message}`, error.code);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      return false;
    }
  }

  async removeReaction(articleId: number, userId: string, reaction: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('article_reactions')
        .delete()
        .eq('article_id', articleId)
        .eq('user_id', userId)
        .eq('reaction', reaction);

      if (error) {
        throw new DatabaseError(`リアクション削除エラー: ${error.message}`, error.code);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      return false;
    }
  }

  async getReactions(articleId: number, userId?: string): Promise<ArticleReaction[]> {
    try {
      let query = this.client
        .from('article_reactions')
        .select('*')
        .eq('article_id', articleId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseError(`リアクション取得エラー: ${error.message}`, error.code);
      }

      return data?.map(this.transformReactionFromDB) || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('リアクション取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  // 質問操作
  async createQuestion(question: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
    try {
      const { data, error } = await this.client
        .from('questions')
        .insert([this.transformQuestionToDB(question)])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`質問作成エラー: ${error.message}`, error.code);
      }

      return this.transformQuestionFromDB(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('質問作成中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async getQuestions(articleId: number, userId?: string): Promise<Question[]> {
    try {
      let query = this.client
        .from('questions')
        .select('*')
        .eq('article_id', articleId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseError(`質問取得エラー: ${error.message}`, error.code);
      }

      return data?.map(this.transformQuestionFromDB) || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('質問取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async answerQuestion(id: string, answer: string): Promise<Question | null> {
    try {
      const { data, error } = await this.client
        .from('questions')
        .update({
          parent_answer: answer,
          status: 'answered',
          answered_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`質問回答エラー: ${error.message}`, error.code);
      }

      return data ? this.transformQuestionFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('質問回答中に予期しないエラーが発生しました', undefined, error);
    }
  }

  // 統計・管理
  async getStats(userId?: string): Promise<{
    totalArticles: number;
    readArticles: number;
    readingRate: number;
    categoryCounts: { [key: string]: number };
  }> {
    try {
      // 記事総数
      const { count: totalArticles } = await this.client
        .from('articles')
        .select('count', { count: 'exact', head: true })
        .eq('is_archived', false);

      // 既読記事数
      const { count: readArticles } = await this.client
        .from('articles')
        .select('count', { count: 'exact', head: true })
        .eq('is_archived', false)
        .eq('has_read', true);

      // カテゴリ別統計
      const { data: categoryData } = await this.client
        .from('articles')
        .select('category')
        .eq('is_archived', false);

      const categoryCounts: { [key: string]: number } = {};
      categoryData?.forEach((article) => {
        categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
      });

      const total = totalArticles || 0;
      const read = readArticles || 0;

      return {
        totalArticles: total,
        readArticles: read,
        readingRate: total > 0 ? Math.round((read / total) * 100) : 0,
        categoryCounts
      };
    } catch (error) {
      throw new DatabaseError('統計取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  // データ変換ヘルパー
  private transformArticleFromDB(dbArticle: any): Article {
    return {
      id: dbArticle.id,
      originalUrl: dbArticle.original_url,
      childAge: dbArticle.child_age,
      originalTitle: dbArticle.original_title,
      convertedTitle: dbArticle.converted_title,
      originalContent: dbArticle.original_content,
      convertedContent: dbArticle.converted_content,
      convertedSummary: dbArticle.converted_summary,
      category: dbArticle.category,
      createdAt: dbArticle.created_at,
      status: dbArticle.status,
      siteName: dbArticle.site_name,
      image: dbArticle.image,
      hasRead: dbArticle.has_read,
      reactions: dbArticle.reactions || [],
      isArchived: dbArticle.is_archived,
      archivedAt: dbArticle.archived_at
    };
  }

  private transformArticleToDB(article: Partial<Article>): any {
    const dbArticle: any = {};

    if (article.originalUrl !== undefined) dbArticle.original_url = article.originalUrl;
    if (article.childAge !== undefined) dbArticle.child_age = article.childAge;
    if (article.originalTitle !== undefined) dbArticle.original_title = article.originalTitle;
    if (article.convertedTitle !== undefined) dbArticle.converted_title = article.convertedTitle;
    if (article.originalContent !== undefined) dbArticle.original_content = article.originalContent;
    if (article.convertedContent !== undefined) dbArticle.converted_content = article.convertedContent;
    if (article.convertedSummary !== undefined) dbArticle.converted_summary = article.convertedSummary;
    if (article.category !== undefined) dbArticle.category = article.category;
    if (article.status !== undefined) dbArticle.status = article.status;
    if (article.siteName !== undefined) dbArticle.site_name = article.siteName;
    if (article.image !== undefined) dbArticle.image = article.image;
    if (article.hasRead !== undefined) dbArticle.has_read = article.hasRead;
    if (article.reactions !== undefined) dbArticle.reactions = article.reactions;
    if (article.isArchived !== undefined) dbArticle.is_archived = article.isArchived;
    if (article.archivedAt !== undefined) dbArticle.archived_at = article.archivedAt;

    // 作成時の自動設定
    if (!article.createdAt && !dbArticle.created_at) {
      dbArticle.created_at = new Date().toISOString();
    }

    return dbArticle;
  }

  private transformUserFromDB(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      userType: dbUser.user_type,
      displayName: dbUser.display_name,
      childAge: dbUser.child_age,
      createdAt: dbUser.created_at,
      lastLoginAt: dbUser.last_login_at
    };
  }

  private transformUserToDB(user: Partial<User>): any {
    const dbUser: any = {};

    if (user.id !== undefined) dbUser.id = user.id;
    if (user.email !== undefined) dbUser.email = user.email;
    if (user.userType !== undefined) dbUser.user_type = user.userType;
    if (user.displayName !== undefined) dbUser.display_name = user.displayName;
    if (user.childAge !== undefined) dbUser.child_age = user.childAge;

    // 作成時の自動設定
    if (!user.createdAt && !dbUser.created_at) {
      dbUser.created_at = new Date().toISOString();
    }
    if (!user.lastLoginAt && !dbUser.last_login_at) {
      dbUser.last_login_at = new Date().toISOString();
    }

    return dbUser;
  }

  private transformReactionFromDB(dbReaction: any): ArticleReaction {
    return {
      id: dbReaction.id,
      articleId: dbReaction.article_id,
      userId: dbReaction.user_id,
      reaction: dbReaction.reaction,
      createdAt: dbReaction.created_at
    };
  }

  private transformQuestionFromDB(dbQuestion: any): Question {
    return {
      id: dbQuestion.id,
      articleId: dbQuestion.article_id,
      userId: dbQuestion.user_id,
      question: dbQuestion.question,
      parentAnswer: dbQuestion.parent_answer,
      status: dbQuestion.status,
      createdAt: dbQuestion.created_at,
      answeredAt: dbQuestion.answered_at
    };
  }

  private transformQuestionToDB(question: Partial<Question>): any {
    const dbQuestion: any = {};

    if (question.articleId !== undefined) dbQuestion.article_id = question.articleId;
    if (question.userId !== undefined) dbQuestion.user_id = question.userId;
    if (question.question !== undefined) dbQuestion.question = question.question;
    if (question.parentAnswer !== undefined) dbQuestion.parent_answer = question.parentAnswer;
    if (question.status !== undefined) dbQuestion.status = question.status;
    if (question.answeredAt !== undefined) dbQuestion.answered_at = question.answeredAt;

    // 作成時の自動設定
    if (!question.createdAt && !dbQuestion.created_at) {
      dbQuestion.created_at = new Date().toISOString();
    }

    return dbQuestion;
  }
}