// インメモリ記事ストレージ（実際のアプリでは永続化が必要）
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
  isArchived: boolean; // アーカイブフラグ
  archivedAt?: string; // アーカイブ日時
}

// インメモリストレージ（グローバルに確実に保持）
const globalForDb = globalThis as unknown as {
  articleStore: Map<number, StoredArticle> | undefined;
};

const articleStore = globalForDb.articleStore ?? new Map<number, StoredArticle>();
globalForDb.articleStore = articleStore;

// 初期サンプルデータ
const initialArticles: StoredArticle[] = [
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

// 初期化（一度だけ実行）
if (articleStore.size === 0) {
  console.log('🔧 初期サンプルデータを設定中...');
  initialArticles.forEach(article => {
    articleStore.set(article.id, article);
  });
  console.log(`🔧 初期化完了: ${articleStore.size}件の記事を設定`);
}

// 既存記事にアーカイブフラグを追加（マイグレーション - 毎回実行）
console.log('🔧 既存記事のマイグレーションをチェック中...');
let migrationCount = 0;
articleStore.forEach((article) => {
  if (article.isArchived === undefined) {
    article.isArchived = false; // 既存記事はデフォルトでアクティブ
    migrationCount++;
  }
});
if (migrationCount > 0) {
  console.log(`🔧 マイグレーション完了: ${migrationCount}件の記事を更新`);
}

// URLで記事の重複チェック
export function findArticleByUrl(url: string): StoredArticle | undefined {
  return Array.from(articleStore.values()).find(article => article.originalUrl === url);
}

// 記事を保存
export function saveArticle(article: Omit<StoredArticle, 'hasRead' | 'reactions' | 'isArchived'>): StoredArticle {
  // 一時的に重複チェックを無効化
  // const existing = findArticleByUrl(article.originalUrl);
  // if (existing) {
  //   console.log(`⚠️ 同じURL の記事が既に存在します: ${article.originalUrl}`);
  //   return existing;
  // }

  const storedArticle: StoredArticle = {
    ...article,
    hasRead: false,
    reactions: [],
    isArchived: false
  };
  
  articleStore.set(article.id, storedArticle);
  console.log(`📚 記事を保存しました: ID=${article.id}, タイトル=${article.convertedTitle.substring(0, 30)}...`);
  console.log(`📊 現在の記事総数: ${articleStore.size}件`);
  return storedArticle;
}

// 子供IDに基づく記事一覧取得
export function getArticlesByChild(childId: string, category?: string, limit: number = 10): StoredArticle[] {
  const allArticles = Array.from(articleStore.values())
    .filter(article => article.isArchived !== true) // アーカイブ記事を除外（undefined も含む）
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  let filteredArticles = allArticles;
  
  // カテゴリフィルタリング
  if (category && category !== 'all') {
    filteredArticles = allArticles.filter(article => 
      article.category === category
    );
  }
  
  // 件数制限
  return filteredArticles.slice(0, limit);
}

// 記事詳細取得
export function getArticleById(id: number): StoredArticle | undefined {
  return articleStore.get(id);
}

// リアクション追加
export function addReaction(articleId: number, reaction: string, childId: string): boolean {
  const article = articleStore.get(articleId);
  if (!article) {
    console.log(`⚠️ 記事${articleId}が見つかりません。本番環境では正常な状況です。`);
    return false; // 例外をスローせずにfalseを返す
  }
  
  if (!article.reactions) {
    article.reactions = [];
  }
  
  if (!article.reactions.includes(reaction)) {
    article.reactions.push(reaction);
  }
  
  console.log(`👍 リアクション追加: 記事${articleId} -> ${reaction} (子供: ${childId})`);
  return true;
}

// 既読マーク
export function markAsRead(articleId: number, childId: string): boolean {
  const article = articleStore.get(articleId);
  if (!article) {
    return false;
  }
  
  article.hasRead = true;
  console.log(`📖 既読マーク: 記事${articleId} (子供: ${childId})`);
  return true;
}

// 統計情報取得（アーカイブ記事除外）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getStats(_childId: string): {
  totalArticles: number;
  readArticles: number;
  readingRate: number;
  categoryCounts: { [key: string]: number };
} {
  const articles = Array.from(articleStore.values()).filter(a => a.isArchived !== true);
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

// 最近の記事取得（親用・アーカイブ状態指定可能）
export function getRecentArticles(limit: number = 5, includeArchived: boolean = false): StoredArticle[] {
  let allArticles = Array.from(articleStore.values());
  
  if (!includeArchived) {
    allArticles = allArticles.filter(article => article.isArchived !== true);
  }
  
  console.log(`🔍 getRecentArticles: 全記事数=${allArticles.length}, 要求件数=${limit}, アーカイブ含む=${includeArchived}`);
  console.log('🔍 記事リスト:', allArticles.map(a => ({ id: a.id, title: a.convertedTitle.substring(0, 20), createdAt: a.createdAt, archived: a.isArchived })));
  
  const sortedArticles = allArticles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  console.log('🔍 ソート後:', sortedArticles.map(a => ({ id: a.id, title: a.convertedTitle.substring(0, 20), createdAt: a.createdAt, archived: a.isArchived })));
  
  const result = sortedArticles.slice(0, limit);
  console.log(`🔍 最終結果: ${result.length}件`);
  
  return result;
}

// アーカイブ記事のみ取得
export function getArchivedArticles(limit: number = 20): StoredArticle[] {
  const archivedArticles = Array.from(articleStore.values())
    .filter(article => article.isArchived === true)
    .sort((a, b) => {
      if (a.archivedAt && b.archivedAt) {
        return new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  
  return archivedArticles.slice(0, limit);
}

// 記事をアーカイブ化
export function archiveArticles(articleIds: number[]): { success: boolean; count: number; errors: string[] } {
  const errors: string[] = [];
  let successCount = 0;
  
  articleIds.forEach(id => {
    const article = articleStore.get(id);
    if (article) {
      if (!article.isArchived) {
        article.isArchived = true;
        article.archivedAt = new Date().toISOString();
        successCount++;
        console.log(`📦 記事をアーカイブ化: ID=${id}, タイトル=${article.convertedTitle}`);
      } else {
        errors.push(`記事ID ${id} は既にアーカイブ済みです`);
      }
    } else {
      errors.push(`記事ID ${id} が見つかりません`);
    }
  });
  
  console.log(`📦 アーカイブ処理完了: ${successCount}件成功, ${errors.length}件エラー`);
  
  return {
    success: errors.length === 0,
    count: successCount,
    errors
  };
}

// 記事のアーカイブを解除
export function unarchiveArticles(articleIds: number[]): { success: boolean; count: number; errors: string[] } {
  const errors: string[] = [];
  let successCount = 0;
  
  articleIds.forEach(id => {
    const article = articleStore.get(id);
    if (article) {
      if (article.isArchived) {
        article.isArchived = false;
        article.archivedAt = undefined;
        successCount++;
        console.log(`📤 記事のアーカイブを解除: ID=${id}, タイトル=${article.convertedTitle}`);
      } else {
        errors.push(`記事ID ${id} はアーカイブされていません`);
      }
    } else {
      errors.push(`記事ID ${id} が見つかりません`);
    }
  });
  
  console.log(`📤 アーカイブ解除完了: ${successCount}件成功, ${errors.length}件エラー`);
  
  return {
    success: errors.length === 0,
    count: successCount,
    errors
  };
}

// デバッグ用：全記事数を取得
export function getTotalArticleCount(): number {
  return articleStore.size;
}