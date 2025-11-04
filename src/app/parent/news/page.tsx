'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '../../../lib/auth';
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

  // アクセス制御チェック
  useEffect(() => {
    if (!requireAuth('parent')) {
      router.push('/login');
      return;
    }
    setIsAuthorized(true);
  }, [router]);

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
    }
  }, [newsItems]);

  const fetchFullTitles = async () => {
    console.log('🔄 完全タイトル取得を一時的に無効化（APIエラー対応）');
    // Yahoo詳細APIのエラーを回避するため、一時的に無効化
    // 基本のニュース一覧表示を優先
    return;
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

  // モーダルから記事変換
  const handleConvertFromModal = async (articleDetail: ArticleDetail) => {
    try {
      console.log(`🔄 記事変換開始: ${articleDetail.title}`);
      
      const response = await fetch('/api/articles/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      
      const response = await fetch('/api/articles/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
                          <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-blue-100 rounded-lg flex items-center justify-center border border-gray-200 hover:from-indigo-100 hover:to-blue-200 transition-colors">
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
                    <button
                      onClick={() => handleConvertNews(selectedNews)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium"
                    >
                      🔄 この記事を子供向けに変換
                    </button>
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
      />
    </div>
  );
}