// クライアントサイド永続化ストレージ
interface StoredArticle {
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

const STORAGE_KEY = 'know-news-articles';

// ブラウザでのみ実行される関数
function isClient(): boolean {
  return typeof window !== 'undefined';
}

// ローカルストレージから記事を取得
export function getStoredArticles(): StoredArticle[] {
  if (!isClient()) return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const articles = JSON.parse(stored) as StoredArticle[];
    return Array.isArray(articles) ? articles : [];
  } catch (error) {
    console.error('ローカルストレージからの記事取得エラー:', error);
    return [];
  }
}

// ローカルストレージに記事を保存
export function saveStoredArticles(articles: StoredArticle[]): boolean {
  if (!isClient()) return false;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
    console.log(`💾 ローカルストレージに${articles.length}件の記事を保存しました`);
    return true;
  } catch (error) {
    console.error('ローカルストレージへの記事保存エラー:', error);
    return false;
  }
}

// 記事を追加
export function addArticleToStorage(article: StoredArticle): boolean {
  const articles = getStoredArticles();
  
  // 重複チェック（URL基準）
  const existingIndex = articles.findIndex(a => a.originalUrl === article.originalUrl);
  if (existingIndex >= 0) {
    // 既存記事を更新
    articles[existingIndex] = article;
    console.log(`📝 既存記事を更新: ${article.convertedTitle}`);
  } else {
    // 新規記事を追加
    articles.unshift(article); // 新しい記事を先頭に追加
    console.log(`➕ 新規記事を追加: ${article.convertedTitle}`);
  }
  
  // ID順でソート（最新が上）
  articles.sort((a, b) => b.id - a.id);
  
  return saveStoredArticles(articles);
}

// 記事の既読状態を更新
export function markArticleAsRead(articleId: number): boolean {
  const articles = getStoredArticles();
  const article = articles.find(a => a.id === articleId);
  
  if (article) {
    article.hasRead = true;
    return saveStoredArticles(articles);
  }
  
  return false;
}

// リアクションを追加
export function addReactionToStorage(articleId: number, reaction: string): boolean {
  const articles = getStoredArticles();
  const article = articles.find(a => a.id === articleId);
  
  if (article) {
    if (!article.reactions.includes(reaction)) {
      article.reactions.push(reaction);
      return saveStoredArticles(articles);
    }
  }
  
  return false;
}

// 記事をアーカイブ
export function archiveArticleInStorage(articleId: number): boolean {
  const articles = getStoredArticles();
  const article = articles.find(a => a.id === articleId);
  
  if (article) {
    article.isArchived = true;
    article.archivedAt = new Date().toISOString();
    return saveStoredArticles(articles);
  }
  
  return false;
}

// ストレージをクリア（デバッグ用）
export function clearStorage(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ ローカルストレージをクリアしました');
}

// 次のIDを取得
export function getNextArticleId(): number {
  const articles = getStoredArticles();
  if (articles.length === 0) return 1000; // 初期サンプル記事と重複を避けるため1000から開始
  
  return Math.max(...articles.map(a => a.id)) + 1;
}