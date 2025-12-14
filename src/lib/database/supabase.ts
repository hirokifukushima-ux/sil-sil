import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DatabaseProvider,
  Article,
  User,
  Organization,
  Invitation,
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
    parentId?: string;
    category?: string;
    isArchived?: boolean;
    limit?: number;
    childAge?: number;
    childId?: string;
  }): Promise<Article[]> {
    try {
      // パフォーマンス最適化: 必要なカラムのみを取得
      let query = this.client.from('articles').select(`
        id,
        converted_title,
        converted_summary,
        category,
        created_at,
        image,
        has_read,
        is_archived,
        parent_id,
        child_age,
        child_id
      `);

      if (filters?.parentId) {
        query = query.eq('parent_id', filters.parentId);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.isArchived !== undefined) {
        query = query.eq('is_archived', filters.isArchived);
      }

      // 子どもIDでフィルタリング（優先）
      if (filters?.childId !== undefined) {
        query = query.eq('child_id', filters.childId);
      } else if (filters?.childAge !== undefined) {
        // childIdが指定されていない場合のみ、年齢でフィルタリング（後方互換性）
        query = query.eq('child_age', filters.childAge);
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
      // パフォーマンス最適化: 記事詳細に必要なカラムのみを取得
      const { data, error} = await this.client
        .from('articles')
        .select(`
          id,
          converted_title,
          converted_summary,
          converted_content,
          category,
          created_at,
          image,
          has_read,
          is_archived,
          parent_id,
          child_age,
          child_id,
          original_url,
          site_name
        `)
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

  async getUsers(filters?: {
    userType?: 'master' | 'parent' | 'child';
    parentId?: string;
    masterId?: string;
    organizationId?: string;
    isActive?: boolean;
  }): Promise<User[]> {
    try {
      let query = this.client.from('users').select('*');

      if (filters?.userType) {
        query = query.eq('user_type', filters.userType);
      }

      if (filters?.parentId) {
        query = query.eq('parent_id', filters.parentId);
      }

      if (filters?.masterId) {
        query = query.eq('master_id', filters.masterId);
      }

      if (filters?.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseError(`ユーザー一覧取得エラー: ${error.message}`, error.code);
      }

      return data?.map(this.transformUserFromDB) || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('ユーザー一覧取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async deactivateUser(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('users')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw new DatabaseError(`ユーザー無効化エラー: ${error.message}`, error.code);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      return false;
    }
  }

  // 組織操作
  async getOrganization(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.client
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`組織取得エラー: ${error.message}`, error.code);
      }

      return data ? this.transformOrganizationFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('組織取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async getOrganizations(filters?: {
    masterId?: string;
    isActive?: boolean;
  }): Promise<Organization[]> {
    try {
      let query = this.client.from('organizations').select('*');

      if (filters?.masterId) {
        query = query.eq('master_id', filters.masterId);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseError(`組織一覧取得エラー: ${error.message}`, error.code);
      }

      return data?.map(this.transformOrganizationFromDB) || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('組織一覧取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async createOrganization(org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
    try {
      const { data, error } = await this.client
        .from('organizations')
        .insert([this.transformOrganizationToDB(org)])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`組織作成エラー: ${error.message}`, error.code);
      }

      return this.transformOrganizationFromDB(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('組織作成中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null> {
    try {
      const updateData = this.transformOrganizationToDB(updates);
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await this.client
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`組織更新エラー: ${error.message}`, error.code);
      }

      return data ? this.transformOrganizationFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('組織更新中に予期しないエラーが発生しました', undefined, error);
    }
  }

  // 招待操作
  async createInvitation(invitation: Omit<Invitation, 'id' | 'createdAt' | 'code'>): Promise<Invitation> {
    try {
      // 招待コードを生成
      const code = this.generateInvitationCode();

      const { data, error } = await this.client
        .from('invitations')
        .insert([this.transformInvitationToDB({ ...invitation, code })])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`招待作成エラー: ${error.message}`, error.code);
      }

      return this.transformInvitationFromDB(data);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('招待作成中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async getInvitation(code: string): Promise<Invitation | null> {
    try {
      const { data, error } = await this.client
        .from('invitations')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`招待取得エラー: ${error.message}`, error.code);
      }

      return data ? this.transformInvitationFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('招待取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async getInvitations(filters?: {
    inviterId?: string;
    status?: 'pending' | 'accepted' | 'expired';
  }): Promise<Invitation[]> {
    try {
      let query = this.client.from('invitations').select('*');

      if (filters?.inviterId) {
        query = query.eq('inviter_id', filters.inviterId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseError(`招待一覧取得エラー: ${error.message}`, error.code);
      }

      return data?.map(this.transformInvitationFromDB) || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('招待一覧取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async acceptInvitation(code: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('code', code);

      if (error) {
        throw new DatabaseError(`招待受諾エラー: ${error.message}`, error.code);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      return false;
    }
  }

  async updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
    try {
      const updateData = this.transformInvitationToDB(updates);
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await this.client
        .from('invitations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Record not found
        throw new DatabaseError(`招待更新エラー: ${error.message}`, error.code);
      }

      return data ? this.transformInvitationFromDB(data) : null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('招待更新中に予期しないエラーが発生しました', undefined, error);
    }
  }

  async expireInvitation(code: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('invitations')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('code', code);

      if (error) {
        throw new DatabaseError(`招待期限切れエラー: ${error.message}`, error.code);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      return false;
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
    try {
      // パフォーマンス最適化: 全てのクエリを並列実行

      // 記事統計のクエリを構築
      let articlesQuery = this.client
        .from('articles')
        .select('count', { count: 'exact', head: true })
        .eq('is_archived', false);

      let readQuery = this.client
        .from('articles')
        .select('count', { count: 'exact', head: true })
        .eq('is_archived', false)
        .eq('has_read', true);

      let categoryQuery = this.client
        .from('articles')
        .select('category')
        .eq('is_archived', false);

      // フィルター適用
      if (filters?.parentId) {
        articlesQuery = articlesQuery.eq('parent_id', filters.parentId);
        readQuery = readQuery.eq('parent_id', filters.parentId);
        categoryQuery = categoryQuery.eq('parent_id', filters.parentId);
      }
      if (filters?.organizationId) {
        articlesQuery = articlesQuery.eq('organization_id', filters.organizationId);
        readQuery = readQuery.eq('organization_id', filters.organizationId);
        categoryQuery = categoryQuery.eq('organization_id', filters.organizationId);
      }

      // 記事統計を並列実行
      const [
        { count: totalArticles },
        { count: readArticles },
        { data: categoryData }
      ] = await Promise.all([
        articlesQuery,
        readQuery,
        categoryQuery
      ]);

      // カテゴリ集計
      const categoryCounts: { [key: string]: number } = {};
      categoryData?.forEach((article) => {
        categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
      });

      const total = totalArticles || 0;
      const read = readArticles || 0;

      const result: any = {
        totalArticles: total,
        readArticles: read,
        readingRate: total > 0 ? Math.round((read / total) * 100) : 0,
        categoryCounts
      };

      // ユーザー統計（organizationIdが指定された場合のみ）- 並列実行
      if (filters?.organizationId) {
        const [
          { count: totalUsers },
          { count: activeUsers },
          { count: parents },
          { count: children }
        ] = await Promise.all([
          this.client
            .from('users')
            .select('count', { count: 'exact', head: true })
            .eq('organization_id', filters.organizationId),
          this.client
            .from('users')
            .select('count', { count: 'exact', head: true })
            .eq('organization_id', filters.organizationId)
            .eq('is_active', true),
          this.client
            .from('users')
            .select('count', { count: 'exact', head: true })
            .eq('organization_id', filters.organizationId)
            .eq('user_type', 'parent'),
          this.client
            .from('users')
            .select('count', { count: 'exact', head: true })
            .eq('organization_id', filters.organizationId)
            .eq('user_type', 'child')
        ]);

        result.userCounts = {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          parents: parents || 0,
          children: children || 0
        };
      }

      return result;
    } catch (error) {
      throw new DatabaseError('統計取得中に予期しないエラーが発生しました', undefined, error);
    }
  }

  // データ変換ヘルパー
  private transformArticleFromDB(dbArticle: Record<string, any>): Article {
    return {
      id: dbArticle.id,
      originalUrl: dbArticle.original_url,
      childAge: dbArticle.child_age,
      childId: dbArticle.child_id, // 子どもID（個別管理用）
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
      archivedAt: dbArticle.archived_at,
      parentId: dbArticle.parent_id
    };
  }

  private transformArticleToDB(article: Partial<Article>): Record<string, any> {
    const dbArticle: Record<string, any> = {};

    if (article.originalUrl !== undefined) dbArticle.original_url = article.originalUrl;
    if (article.childAge !== undefined) dbArticle.child_age = article.childAge;
    if (article.childId !== undefined) dbArticle.child_id = article.childId; // 子どもID（個別管理用）
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
    if (article.parentId !== undefined) dbArticle.parent_id = article.parentId;

    // 作成時の自動設定
    if (!article.createdAt && !dbArticle.created_at) {
      dbArticle.created_at = new Date().toISOString();
    }

    return dbArticle;
  }

  private transformUserFromDB(dbUser: Record<string, any>): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      userType: dbUser.user_type,
      displayName: dbUser.display_name,
      childAge: dbUser.child_age,
      parentId: dbUser.parent_id,
      masterId: dbUser.master_id,
      organizationId: dbUser.organization_id,
      isActive: dbUser.is_active,
      createdAt: dbUser.created_at,
      lastLoginAt: dbUser.last_login_at,
      createdBy: dbUser.created_by
    };
  }

  private transformUserToDB(user: Partial<User>): Record<string, any> {
    const dbUser: any = {};

    if (user.id !== undefined) dbUser.id = user.id;
    if (user.email !== undefined) dbUser.email = user.email;
    if (user.userType !== undefined) dbUser.user_type = user.userType;
    if (user.displayName !== undefined) dbUser.display_name = user.displayName;
    if (user.childAge !== undefined) dbUser.child_age = user.childAge;
    if (user.parentId !== undefined) dbUser.parent_id = user.parentId;
    if (user.masterId !== undefined) dbUser.master_id = user.masterId;
    if (user.organizationId !== undefined) dbUser.organization_id = user.organizationId;
    if (user.isActive !== undefined) dbUser.is_active = user.isActive;
    if (user.createdBy !== undefined) dbUser.created_by = user.createdBy;

    // 作成時の自動設定
    if (!user.createdAt && !dbUser.created_at) {
      dbUser.created_at = new Date().toISOString();
    }
    if (!user.lastLoginAt && !dbUser.last_login_at) {
      dbUser.last_login_at = new Date().toISOString();
    }

    return dbUser;
  }

  private transformReactionFromDB(dbReaction: Record<string, any>): ArticleReaction {
    return {
      id: dbReaction.id,
      articleId: dbReaction.article_id,
      userId: dbReaction.user_id,
      reaction: dbReaction.reaction,
      createdAt: dbReaction.created_at
    };
  }

  private transformQuestionFromDB(dbQuestion: Record<string, any>): Question {
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

  private transformQuestionToDB(question: Partial<Question>): Record<string, any> {
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

  private transformOrganizationFromDB(dbOrg: Record<string, any>): Organization {
    return {
      id: dbOrg.id,
      name: dbOrg.name,
      masterId: dbOrg.master_id,
      isActive: dbOrg.is_active,
      createdAt: dbOrg.created_at,
      updatedAt: dbOrg.updated_at
    };
  }

  private transformOrganizationToDB(org: Partial<Organization>): Record<string, any> {
    const dbOrg: any = {};

    if (org.id !== undefined) dbOrg.id = org.id;
    if (org.name !== undefined) dbOrg.name = org.name;
    if (org.masterId !== undefined) dbOrg.master_id = org.masterId;
    if (org.isActive !== undefined) dbOrg.is_active = org.isActive;

    // 作成時の自動設定
    if (!org.createdAt && !dbOrg.created_at) {
      dbOrg.created_at = new Date().toISOString();
    }
    if (!org.updatedAt && !dbOrg.updated_at) {
      dbOrg.updated_at = new Date().toISOString();
    }

    return dbOrg;
  }

  private transformInvitationFromDB(dbInvitation: Record<string, any>): Invitation {
    return {
      id: dbInvitation.id,
      email: dbInvitation.email,
      inviterType: dbInvitation.inviter_type,
      inviterId: dbInvitation.inviter_id,
      targetType: dbInvitation.target_type,
      organizationId: dbInvitation.organization_id,
      parentId: dbInvitation.parent_id,
      status: dbInvitation.status,
      code: dbInvitation.code,
      type: dbInvitation.type || 'private', // デフォルトはprivate
      expiresAt: dbInvitation.expires_at,
      createdAt: dbInvitation.created_at,
      acceptedUserId: dbInvitation.accepted_user_id,
      acceptedAt: dbInvitation.accepted_at
    };
  }

  private transformInvitationToDB(invitation: Partial<Invitation>): Record<string, any> {
    const dbInvitation: any = {};

    if (invitation.id !== undefined) dbInvitation.id = invitation.id;
    if (invitation.email !== undefined) dbInvitation.email = invitation.email;
    if (invitation.inviterType !== undefined) dbInvitation.inviter_type = invitation.inviterType;
    if (invitation.inviterId !== undefined) dbInvitation.inviter_id = invitation.inviterId;
    if (invitation.targetType !== undefined) dbInvitation.target_type = invitation.targetType;
    if (invitation.organizationId !== undefined) dbInvitation.organization_id = invitation.organizationId;
    if (invitation.parentId !== undefined) dbInvitation.parent_id = invitation.parentId;
    if (invitation.status !== undefined) dbInvitation.status = invitation.status;
    if (invitation.code !== undefined) dbInvitation.code = invitation.code;
    if (invitation.type !== undefined) dbInvitation.type = invitation.type;
    if (invitation.expiresAt !== undefined) dbInvitation.expires_at = invitation.expiresAt;
    if (invitation.acceptedUserId !== undefined) dbInvitation.accepted_user_id = invitation.acceptedUserId;
    if (invitation.acceptedAt !== undefined) dbInvitation.accepted_at = invitation.acceptedAt;

    // 作成時の自動設定
    if (!invitation.createdAt && !dbInvitation.created_at) {
      dbInvitation.created_at = new Date().toISOString();
    }

    return dbInvitation;
  }

  private generateInvitationCode(): string {
    // 8文字のランダムな招待コードを生成（大文字英数字）
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // トークン使用量管理
  async getUserTokenUsage(userId: string): Promise<{
    totalTokensUsed: number;
    tokenLimit: number;
    tokensResetAt: Date;
  }> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('total_tokens_used, token_limit, tokens_reset_at')
        .eq('id', userId)
        .single();

      if (error) {
        throw new DatabaseError(`トークン使用量取得エラー: ${error.message}`, error.code);
      }

      if (!data) {
        throw new DatabaseError('ユーザーが見つかりません', 'USER_NOT_FOUND');
      }

      return {
        totalTokensUsed: data.total_tokens_used || 0,
        tokenLimit: data.token_limit || 50000,
        tokensResetAt: new Date(data.tokens_reset_at)
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('トークン使用量取得に失敗しました', 'UNKNOWN');
    }
  }

  async updateUserTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    try {
      const { error } = await this.client
        .from('users')
        .update({
          total_tokens_used: this.client.rpc('increment_tokens', { user_id: userId, tokens: tokensUsed })
        })
        .eq('id', userId);

      if (error) {
        // RPC関数がない場合は、直接UPDATEを試みる
        const { data: currentData, error: fetchError } = await this.client
          .from('users')
          .select('total_tokens_used')
          .eq('id', userId)
          .single();

        if (fetchError) {
          throw new DatabaseError(`トークン使用量取得エラー: ${fetchError.message}`, fetchError.code);
        }

        const newTotal = (currentData?.total_tokens_used || 0) + tokensUsed;

        const { error: updateError } = await this.client
          .from('users')
          .update({ total_tokens_used: newTotal })
          .eq('id', userId);

        if (updateError) {
          throw new DatabaseError(`トークン使用量更新エラー: ${updateError.message}`, updateError.code);
        }
      }

      console.log(`✅ ユーザー ${userId} のトークン使用量を ${tokensUsed} トークン更新しました`);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('トークン使用量更新に失敗しました', 'UNKNOWN');
    }
  }
}