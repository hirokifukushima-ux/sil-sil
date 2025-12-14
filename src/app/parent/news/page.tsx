'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isParentUser, getAuthSession } from '../../../lib/auth';
import ArticleDetailModal, { ArticleDetail } from '../../../components/ArticleDetailModal';

export interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
  thumbnail?: string;
}

const categories = [
  { key: 'all', label: '全て' },
  { key: 'main', label: '主要' },
  { key: 'domestic', label: '国内' },
  { key: 'world', label: '国際' },
  { key: 'business', label: '経済' },
  { key: 'entertainment', label: 'エンタメ' },
  { key: 'sports', label: 'スポーツ' },
  { key: 'it', label: 'IT' },
  { key: 'science', label: '科学' },
];

// 年齢から学年を自動計算
const getGradeFromAge = (age: number): string => {
  if (age <= 6) return '小1';
  if (age === 7) return '小1';
  if (age === 8) return '小2';
  if (age === 9) return '小3';
  if (age === 10) return '小4';
  if (age === 11) return '小5';
  if (age === 12) return '小6';
  if (age === 13) return '中1';
  if (age === 14) return '中2';
  if (age === 15) return '中3';
  return `${age}歳`;
};

export default function NewsListPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('main');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalUrl, setDetailModalUrl] = useState('');
  const [fullTitles, setFullTitles] = useState<{[url: string]: string}>({});
  const [articleImages, setArticleImages] = useState<{[url: string]: string}>({});
  const [convertedArticles, setConvertedArticles] = useState<{[url: string]: boolean}>({});
  const [urlMappings, setUrlMappings] = useState<{[pickupUrl: string]: string}>({});

  // 子どもの選択状態
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [children, setChildren] = useState<Array<{
    id: string;
    name: string;
    age: number;
    grade: string;
  }>>([]);

  // アクセス制御チェック
  useEffect(() => {
    console.log('🔍 ニュースページ：認証チェック開始');
    if (!isParentUser()) {
      console.log('❌ ニュースページ：認証失敗、ログインページへリダイレクト');
      router.push('/login');
      return;
    }
    console.log('✅ ニュースページ：認証成功');
    setIsAuthorized(true);

    // ページ読み込み時に localStorage から変換済み状態を復元
    loadConvertedStateFromStorage();
  }, [router]);

  // 子ども一覧を取得
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchChildren = async () => {
      try {
        const session = getAuthSession();
        if (!session) return;

        const response = await fetch('/api/parent/children', {
          headers: {
            'X-Auth-Session': JSON.stringify({
              userId: session.userId,
              userType: session.userType
            }),
          },
        });
        const result = await response.json();

        if (result.success && result.children.length > 0) {
          const formattedChildren = result.children.map((child: {
            id: string;
            displayName: string;
            childAge: number;
          }) => ({
            id: child.id,
            name: child.displayName,
            age: child.childAge,
            grade: getGradeFromAge(child.childAge)
          }));
          setChildren(formattedChildren);
          // デフォルトで最初の子どもを選択
          if (formattedChildren.length > 0) {
            setSelectedChild(formattedChildren[0].id);
          }
        }
      } catch (error) {
        console.error('子ども一覧取得エラー:', error);
      }
    };

    fetchChildren();
  }, [isAuthorized]);

  // localStorage から変換済み状態を読み込み
  const loadConvertedStateFromStorage = () => {
    try {
      const saved = localStorage.getItem('convertedArticles');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConvertedArticles(parsed);
        console.log('📱 localStorage から変換済み状態を復元:', Object.keys(parsed));
      }
    } catch (error) {
      console.error('localStorage 読み込みエラー:', error);
    }
  };

  // localStorage に変換済み状態を保存
  const saveConvertedStateToStorage = (state: {[url: string]: boolean}) => {
    try {
      localStorage.setItem('convertedArticles', JSON.stringify(state));
      console.log('📱 localStorage に変換済み状態を保存:', Object.keys(state));
    } catch (error) {
      console.error('localStorage 保存エラー:', error);
    }
  };

  // ニュース取得
  const fetchNews = async (category: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 ニュース取得開始: ${category}`);
      const response = await fetch(`/api/news/list?category=${category}&limit=20`);
      const result = await response.json();
      
      if (result.success) {
        setNewsItems(result.news);
        console.log(`✅ ニュース取得完了: ${result.news.length}件`);
      } else {
        throw new Error(result.error || 'ニュースの取得に失敗しました');
      }
    } catch (error) {
      console.error('ニュース取得エラー:', error);
      setError(error instanceof Error ? error.message : 'ニュースの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // カテゴリ変更時
  useEffect(() => {
    if (isAuthorized) {
      fetchNews(selectedCategory);
    }
  }, [selectedCategory, isAuthorized]);

  // 完全タイトル取得（段階的読み込み）
  useEffect(() => {
    if (newsItems.length > 0) {
      fetchFullTitles();
      checkConvertedArticles();
    }
  }, [newsItems]);

  const fetchFullTitles = async () => {
    console.log('🔄 完全タイトル取得を一時的に無効化（APIエラー対応）');
    // Yahoo詳細APIのエラーを回避するため、一時的に無効化
    // 基本のニュース一覧表示を優先
    return;
  };

  // pickup URLからarticles URLを取得する関数
  const getArticleUrlFromPickup = async (pickupUrl: string): Promise<string> => {
    try {
      if (!pickupUrl.includes('/pickup/')) {
        return pickupUrl;
      }
      
      const response = await fetch(`/api/news/detail?url=${encodeURIComponent(pickupUrl)}`);
      const result = await response.json();
      
      if (result.success && result.article?.url) {
        return result.article.url;
      }
      
      return pickupUrl;
    } catch (error) {
      console.error('pickup URL変換エラー:', error);
      return pickupUrl;
    }
  };

  // 変換済み記事をチェックする関数（改良版）
  const checkConvertedArticles = async () => {
    try {
      console.log('🔍 変換済み記事をチェック中...');
      
      // 認証情報を取得
      const session = getAuthSession();
      if (!session) {
        console.error('認証情報がありません');
        return;
      }
      
      const response = await fetch('/api/articles/recent', {
        headers: {
          'X-Auth-Session': JSON.stringify(session),
        },
      });
      const result = await response.json();
      
      if (result.success && result.articles) {
        const convertedUrls: {[url: string]: boolean} = {};
        const convertedArticleUrls = new Set<string>();
        
        // データベースから取得した記事のURLをセットに追加
        result.articles.forEach((article: { originalUrl: string }) => {
          if (article.originalUrl) {
            convertedUrls[article.originalUrl] = true;
            convertedArticleUrls.add(article.originalUrl);
          }
        });
        
        // URL マッピングを活用した変換済みチェック
        newsItems.forEach(news => {
          if (news.link.includes('/pickup/')) {
            // 記録されたマッピングをチェック
            const mappedArticlesUrl = urlMappings[news.link];
            if (mappedArticlesUrl && convertedArticleUrls.has(mappedArticlesUrl)) {
              convertedUrls[news.link] = true;
              console.log(`🔗 マッピング経由で変換済み確認: ${news.link} → ${mappedArticlesUrl}`);
            } else {
              // フォールバック: 記事IDベースのマッピング
              const pickupMatch = news.link.match(/\/pickup\/(\d+)/);
              if (pickupMatch) {
                const pickupId = pickupMatch[1];
                
                // データベースのarticles URLで同じIDを含むものを探す
                for (const articleUrl of convertedArticleUrls) {
                  if (articleUrl.includes('/articles/') && articleUrl.includes(pickupId)) {
                    convertedUrls[news.link] = true;
                    console.log(`🔗 ID マッピング: pickup ${pickupId} → ${articleUrl}`);
                    break;
                  }
                }
              }
            }
          }
        });
        
        console.log('🔍 データベースの変換済みURL:', Array.from(convertedArticleUrls));
        console.log('🔍 ニュース一覧のURL:', newsItems.map(news => news.link));
        console.log('🔍 最終的な変換済みマップ:', Object.keys(convertedUrls));
        
        // 状態更新と localStorage 保存
        const newState = { ...convertedArticles, ...convertedUrls };
        setConvertedArticles(newState);
        saveConvertedStateToStorage(newState);
        console.log(`✅ 変換済み記事チェック完了: ${Object.keys(convertedUrls).length}件発見`);
      }
    } catch (error) {
      console.error('変換済み記事チェックエラー:', error);
    }
  };

  // 記事選択処理
  const handleNewsSelect = (news: NewsItem) => {
    setSelectedNews(news);
  };

  // 記事詳細表示
  const handleShowDetail = (news: NewsItem) => {
    setDetailModalUrl(news.link);
    setIsDetailModalOpen(true);
  };

  // URL マッピングの記録
  const recordUrlMapping = (pickupUrl: string, articlesUrl: string) => {
    setUrlMappings(prev => ({
      ...prev,
      [pickupUrl]: articlesUrl
    }));
    console.log(`🔗 URLマッピング記録: ${pickupUrl} → ${articlesUrl}`);
  };

  // モーダルから記事変換
  const handleConvertFromModal = async (articleDetail: ArticleDetail) => {
    try {
      console.log(`🔄 記事変換開始: ${articleDetail.title}`);

      // 認証情報を取得
      const session = getAuthSession();
      if (!session) {
        alert('❌ 認証情報が見つかりません。再ログインしてください。');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/articles/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Session': JSON.stringify(session),
        },
        body: JSON.stringify({
          url: articleDetail.url,
          childAge: 8 // デフォルト年齢
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // ローカルストレージに記事を保存
        if (typeof window !== 'undefined') {
          try {
            const { addArticleToStorage } = await import('@/lib/client-storage');
            addArticleToStorage(result.article);
            console.log('📱 記事をローカルストレージに保存しました');
          } catch (error) {
            console.error('ローカルストレージ保存エラー:', error);
          }
        }
        
        setIsDetailModalOpen(false); // モーダルを閉じる
        
        // 変換済み状態を更新（articles URLと元のpickup URLの両方）
        const newState = {
          ...convertedArticles,
          [articleDetail.url]: true,
          // モーダルを開いた元のpickup URLも更新
          [detailModalUrl]: true
        };
        setConvertedArticles(newState);
        saveConvertedStateToStorage(newState);
        
        alert(`✅ 記事の変換が完了しました！\n\n変換後タイトル: ${result.article.convertedTitle}\n\n子供がニュースページで読めるようになりました！`);
        
        // 親ダッシュボードに戻る
        router.push('/parent');
      } else {
        throw new Error(result.error || 'サーバーエラーが発生しました');
      }
    } catch (error) {
      console.error('記事変換エラー:', error);
      alert(`❌ エラー: ${error instanceof Error ? error.message : '記事の変換中にエラーが発生しました'}`);
    }
  };

  // 記事変換処理
  const handleConvertNews = async (news: NewsItem) => {
    const selectedChild = '123e4567-e89b-12d3-a456-426614174000'; // デフォルト子ども

    try {
      console.log(`🔄 記事変換開始: ${news.title}`);

      // 認証情報を取得
      const session = getAuthSession();
      if (!session) {
        alert('❌ 認証情報が見つかりません。再ログインしてください。');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/articles/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Session': JSON.stringify(session),
        },
        body: JSON.stringify({
          url: news.link,
          childAge: 8 // デフォルト年齢
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // ローカルストレージに記事を保存
        if (typeof window !== 'undefined') {
          try {
            const { addArticleToStorage } = await import('@/lib/client-storage');
            addArticleToStorage(result.article);
            console.log('📱 記事をローカルストレージに保存しました');
          } catch (error) {
            console.error('ローカルストレージ保存エラー:', error);
          }
        }
        
        // 変換済み状態を更新
        const newState = {
          ...convertedArticles,
          [news.link]: true,
          // APIから返されたoriginalUrlも更新（articles URLの場合）
          ...(result.article.originalUrl && {[result.article.originalUrl]: true})
        };
        setConvertedArticles(newState);
        saveConvertedStateToStorage(newState);
        
        alert(`✅ 記事の変換が完了しました！\n\n変換後タイトル: ${result.article.convertedTitle}\n\n子供がニュースページで読めるようになりました！`);
        
        // 親ダッシュボードに戻る
        router.push('/parent');
      } else {
        throw new Error(result.error || 'サーバーエラーが発生しました');
      }
    } catch (error) {
      console.error('記事変換エラー:', error);
      alert(`❌ エラー: ${error instanceof Error ? error.message : '記事の変換中にエラーが発生しました'}`);
    }
  };

  // 未認証の場合
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🔄</div>
          <div className="text-gray-600">認証確認中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/parent" className="flex items-center">
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  🏠 シルシル
                </span>
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-semibold text-gray-900">📰 ニュース選択</h1>
            </div>
            <Link 
              href="/parent"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 子ども選択 - コンパクトなタブ形式 */}
        {children.length > 0 && (
          <div className="bg-white border-b border-gray-200 mb-6 rounded-t-lg">
            <div className="flex items-center space-x-1 overflow-x-auto px-4 lg:px-6">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child.id)}
                  className={`group relative px-4 py-3 flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
                    selectedChild === child.id
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">👧</span>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{child.name}</span>
                    <span className="text-xs text-gray-500">
                      {child.age}歳 ({child.grade})
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            {/* カテゴリ選択 */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">カテゴリ選択</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category.key
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ニュース一覧 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    ニュース一覧
                  </h2>
                  <button
                    onClick={() => fetchNews(selectedCategory)}
                    disabled={isLoading}
                    className="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                  >
                    {isLoading ? '更新中...' : '🔄 更新'}
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {error && (
                  <div className="p-6 text-center text-red-600">
                    ❌ {error}
                  </div>
                )}
                
                {isLoading && (
                  <div className="p-6 text-center text-gray-500">
                    <div className="text-4xl mb-4 animate-spin">🔄</div>
                    ニュースを読み込み中...
                  </div>
                )}
                
                {!isLoading && !error && newsItems.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    📰 ニュースが見つかりませんでした
                  </div>
                )}
                
                {!isLoading && newsItems.map((news, index) => {
                  const displayTitle = fullTitles[news.link] || news.title;
                  const isFullTitleLoaded = !!fullTitles[news.link];
                  const articleImage = articleImages[news.link];
                  const isConverted = convertedArticles[news.link];
                  
                  return (
                    <div 
                      key={index} 
                      className={`p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        selectedNews?.link === news.link ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' : 'hover:shadow-sm'
                      }`}
                      onClick={() => handleNewsSelect(news)}
                    >
                      <div className="flex items-start space-x-4">
                        {/* サムネイル画像 - ニュースアプリ風デザイン */}
                        <div 
                          className="flex-shrink-0 w-32 h-20 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowDetail(news);
                          }}
                        >
                          {news.thumbnail ? (
                            <img 
                              src={news.thumbnail} 
                              alt={news.title}
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                              onError={(e) => {
                                // 画像読み込み失敗時はプレースホルダーを表示
                                e.currentTarget.style.display = 'none';
                                const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                if (placeholder) placeholder.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full bg-gradient-to-br from-indigo-50 to-blue-100 rounded-lg flex items-center justify-center border border-gray-200 hover:from-indigo-100 hover:to-blue-200 transition-colors ${
                              news.thumbnail ? 'hidden' : 'flex'
                            }`}
                          >
                            <div className="text-center">
                              <span className="text-indigo-400 text-2xl mb-1 block">📰</span>
                              <span className="text-indigo-600 text-xs font-medium">NEWS</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="text-base font-semibold text-gray-900 mb-2 leading-tight hover:text-indigo-600 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDetail(news);
                            }}
                          >
                            {displayTitle}
                            {!isFullTitleLoaded && news.link.includes('/pickup/') && (
                              <span className="ml-2 text-xs text-gray-400 animate-pulse">⏳</span>
                            )}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                            {news.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                                {news.category}
                              </span>
                              {isConverted && (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                  ✅ 変換済み
                                </span>
                              )}
                              <span>{new Date(news.pubDate).toLocaleDateString('ja-JP')}</span>
                              <span>{new Date(news.pubDate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowDetail(news);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                              >
                                📖 詳細
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(news.link, '_blank');
                                }}
                                className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                              >
                                🔗 元記事
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-8">
            {/* 選択中の記事 */}
            {selectedNews && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📋 選択中の記事
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {fullTitles[selectedNews.link] || selectedNews.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedNews.description}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {selectedNews.category}
                      </span>
                      <span>{new Date(selectedNews.pubDate).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => handleShowDetail(selectedNews)}
                      className="w-full py-2 px-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                    >
                      📖 詳細を読む
                    </button>
                    {convertedArticles[selectedNews.link] ? (
                      <div className="w-full py-3 px-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
                        <div className="text-center font-medium">
                          ✅ 変換済み
                        </div>
                        <div className="text-xs text-center mt-1 text-green-600">
                          記事管理で確認できます
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConvertNews(selectedNews)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium"
                      >
                        🔄 この記事を子供向けに変換
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => window.open(selectedNews.link, '_blank')}
                    className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    🔗 元記事を確認
                  </button>
                </div>
              </div>
            )}

            {/* 使い方 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📖 使い方
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-500 font-bold">1.</span>
                  <span>カテゴリを選んでニュースを絞り込み</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-500 font-bold">2.</span>
                  <span>気になる記事をクリックして選択</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-500 font-bold">3.</span>
                  <span>「元記事を確認」で内容をチェック</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-500 font-bold">4.</span>
                  <span>「変換」ボタンで子供向けに変換</span>
                </div>
              </div>
            </div>

            {/* 統計 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📊 取得状況
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">カテゴリ</span>
                  <span className="text-sm font-medium text-indigo-600">
                    {categories.find(c => c.key === selectedCategory)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">記事数</span>
                  <span className="text-sm font-medium text-green-600">{newsItems.length}件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">最終更新</span>
                  <span className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 記事詳細モーダル */}
      <ArticleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        articleUrl={detailModalUrl}
        onConvert={handleConvertFromModal}
        childAge={selectedChild ? children.find(c => c.id === selectedChild)?.age : undefined}
        childId={selectedChild || undefined}
      />
    </div>
  );
}