'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearUserType, requireAuth } from "../../lib/auth";

export default function KidsNews() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newsArticles, setNewsArticles] = useState<Array<{
    id: number;
    title: string;
    titleFurigana: string;
    summary: string;
    category: string;
    categoryColor: string;
    emoji: string;
    readTime: string;
    isNew: boolean;
    hasRead: boolean;
    content: string;
    reactions: string[];
    image?: string;
    createdAt: string;
    formattedDate: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // アクセス制御チェック
  useEffect(() => {
    if (!requireAuth('child')) {
      router.push('/login');
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  // APIとローカルストレージから記事データを取得
  useEffect(() => {
    if (!isAuthorized) return;
    const fetchArticles = async () => {
      try {
        // データベース統合：APIから記事を直接取得（Supabase優先）
        let allArticles: Array<{
          id: number;
          convertedTitle: string;
          convertedSummary: string;
          category: string;
          createdAt: string;
          hasRead: boolean;
          convertedContent: string;
          reactions: string[];
          isArchived?: boolean;
        }> = [];
        
        // APIから記事を取得（データベース優先で一元管理）
        try {
          const response = await fetch('/api/articles/child/8');
          const result = await response.json();
          
          if (result.success && result.articles.length > 0) {
            allArticles = result.articles.filter((article: {
              isArchived?: boolean;
            }) => article.isArchived !== true);
            console.log(`🗄️ データベースから${allArticles.length}件の記事を取得`);
          }
        } catch (error) {
          console.warn('データベース記事取得エラー:', error);
        }
        
        if (allArticles.length > 0) {
          // 最新順にソート（日付の新しい順）
          const sortedArticles = allArticles.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // 記事データを画面表示用に変換
          const convertedArticles = sortedArticles.map((article: {
            id: number;
            convertedTitle: string;
            convertedSummary: string;
            category: string;
            createdAt: string;
            hasRead: boolean;
            convertedContent: string;
            reactions: string[];
          }) => {
            // 動的な色とemoji設定
            let categoryColor = 'bg-purple-400';
            let emoji = '📰';
            
            if (article.category) {
              if (article.category.includes('かがく') || article.category.includes('科学')) {
                categoryColor = 'bg-blue-400';
                emoji = '🔬';
              } else if (article.category.includes('スポーツ')) {
                categoryColor = 'bg-green-400';
                emoji = '⚽';
              } else if (article.category.includes('ぶんか') || article.category.includes('文化')) {
                categoryColor = 'bg-pink-400';
                emoji = '🎨';
              } else if (article.category.includes('けいざい') || article.category.includes('経済')) {
                categoryColor = 'bg-yellow-400';
                emoji = '💰';
              } else if (article.category.includes('せいじ') || article.category.includes('政治')) {
                categoryColor = 'bg-red-400';
                emoji = '🏛️';
              } else if (article.category.includes('しゃかい') || article.category.includes('社会')) {
                categoryColor = 'bg-teal-400';
                emoji = '🌍';
              }
            }
            
            // 日付のフォーマット（子供向けに分かりやすく）
            const formatDate = (dateString: string) => {
              const date = new Date(dateString);
              const today = new Date();
              const diffTime = today.getTime() - date.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays === 0) {
                return 'きょう';
              } else if (diffDays === 1) {
                return 'きのう';
              } else {
                return `${date.getMonth() + 1}月${date.getDate()}日`;
              }
            };
            
            return {
              id: article.id,
              title: article.convertedTitle,
              titleFurigana: article.convertedTitle,
              summary: article.convertedSummary,
              category: article.category,
              categoryColor: categoryColor,
              emoji: emoji,
              readTime: "3ぷん",
              isNew: new Date(article.createdAt) > new Date(Date.now() - 24*60*60*1000),
              hasRead: article.hasRead,
              content: article.convertedContent,
              reactions: article.reactions || [],
              image: (article as any).image,
              createdAt: article.createdAt,
              formattedDate: formatDate(article.createdAt)
            };
          });
          setNewsArticles(convertedArticles);
        }
      } catch (error) {
        console.error('記事取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [isAuthorized]);


  const badges = [
    { name: "はじめての きじ", emoji: "🎉", earned: true },
    { name: "かがく はかせ", emoji: "🧪", earned: true },
    { name: "どくしょ おう", emoji: "👑", earned: false },
    { name: "しつもん おう", emoji: "❓", earned: false }
  ];

  // 動的にカテゴリを生成（記事から自動取得）
  const getDynamicCategories = () => {
    const uniqueCategories = [...new Set(newsArticles.map(article => article.category))];
    const categoryList = [{ id: 'all', name: 'ぜんぶ', emoji: '📰' }];
    
    uniqueCategories.forEach(category => {
      if (category) {
        // カテゴリに応じたemoji設定
        let emoji = '📰';
        if (category.includes('かがく') || category.includes('科学')) emoji = '🔬';
        else if (category.includes('スポーツ')) emoji = '⚽';
        else if (category.includes('ぶんか') || category.includes('文化')) emoji = '🎨';
        else if (category.includes('けいざい') || category.includes('経済')) emoji = '💰';
        else if (category.includes('せいじ') || category.includes('政治')) emoji = '🏛️';
        else if (category.includes('しゃかい') || category.includes('社会')) emoji = '🌍';
        
        categoryList.push({ 
          id: category, 
          name: category, 
          emoji: emoji 
        });
      }
    });
    
    return categoryList;
  };

  const categories = getDynamicCategories();

  const filteredArticles = selectedCategory === 'all' 
    ? newsArticles 
    : newsArticles.filter(article => article.category === selectedCategory);

  const handleReadArticle = (articleId: number) => {
    window.location.href = `/kids/article/${articleId}`;
  };

  const handleReaction = async (articleId: number, reaction: string) => {
    try {
      // 現在のリアクション状態を確認
      const article = newsArticles.find(a => a.id === articleId);
      const hasReaction = article?.reactions?.includes(reaction);
      
      const response = await fetch(`/api/articles/${articleId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reaction: reaction,
          childId: 'child1'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // UIを即座に更新
        setNewsArticles(prevArticles => 
          prevArticles.map(article => {
            if (article.id === articleId) {
              const currentReactions = article.reactions || [];
              const updatedReactions = hasReaction 
                ? currentReactions.filter(r => r !== reaction)
                : [...currentReactions, reaction];
              
              return { ...article, reactions: updatedReactions };
            }
            return article;
          })
        );
        
        // 成功メッセージ
        const messages = {
          good: hasReaction ? 'リアクションを とりけしたよ' : 'わかったんだね！すごい！ 🎉',
          fun: hasReaction ? 'リアクションを とりけしたよ' : 'たのしんでくれて うれしいよ！ 😊',
          difficult: hasReaction ? 'リアクションを とりけしたよ' : 'むずかしかったね。また いっしょに よんでみよう！ 📚',
          question: hasReaction ? 'リアクションを とりけしたよ' : 'いい しつもんだね！おとうさん おかあさんに きいてみよう！ ❓'
        };
        
        // トーストメッセージを表示
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse';
        toast.textContent = messages[reaction as keyof typeof messages];
        document.body.appendChild(toast);
        
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 2000);
        
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('リアクション送信エラー:', error);
      alert('リアクションの送信中にエラーが発生しました');
    }
  };

  const handleLogout = () => {
    clearUserType();
    router.push('/login');
  };

  // 未認証の場合は何も表示しない（リダイレクト中）
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🔄</div>
          <div className="text-gray-600">確認中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-200">
      {/* ヘッダー */}
      <header className="bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/kids" className="flex items-center space-x-2">
              <span className="text-2xl">🏠</span>
              <span className="text-xl font-bold text-purple-600 flex items-baseline">
                シルシル
                <span className="text-xs font-normal text-gray-400 ml-1">for kids</span>
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              {/* しつもん機能 - 現在未使用のため非表示 */}
              {/* <Link href="/kids/questions" className="flex items-center space-x-2 bg-pink-100 hover:bg-pink-200 px-4 py-2 rounded-full transition-colors">
                <span className="text-lg">❓</span>
                <span className="text-sm font-medium text-pink-600">しつもん</span>
              </Link> */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🧒</span>
                  <span className="text-sm font-medium text-gray-600">こども モード</span>
                </div>
                {/* もどるボタン - 子供は自分のページで完結するため不要 */}
                {/* <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  もどる
                </button> */}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ウェルカメッセージ - ファーストビューでニュース一覧を優先するため非表示 */}
        {/* <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-lg">
          <div className="text-center">
            <div className="text-6xl mb-4">👋</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              こんにちは！
            </h1>
            <p className="text-gray-600">
              きょうも あたらしい ニュースを よんでみよう！
            </p>
          </div>
        </div> */}

        {/* バッジセクション - 現在未使用のため非表示 */}
        {/* <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-2xl mr-2">🏆</span>
            きみの バッジ
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {badges.map((badge, index) => (
              <div
                key={index}
                className={`p-4 rounded-2xl text-center transition-all duration-300 ${
                  badge.earned
                    ? 'bg-gradient-to-br from-yellow-300 to-orange-300 shadow-lg transform scale-105'
                    : 'bg-gray-100 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{badge.emoji}</div>
                <div className={`text-xs font-medium ${
                  badge.earned ? 'text-orange-800' : 'text-gray-500'
                }`}>
                  {badge.name}
                </div>
              </div>
            ))}
          </div>
        </div> */}

        {/* カテゴリフィルター */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            カテゴリを えらぼう
          </h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-lg transform scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg mr-2">{category.emoji}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* ローディング表示 */}
        {loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">🔄</div>
            <h2 className="text-2xl font-bold text-gray-800">
              ニュースを よみこみちゅう...
            </h2>
          </div>
        )}

        {/* ニュース記事 */}
        {!loading && (
          <div className="space-y-6">
            {filteredArticles.map((article) => (
            <div
              key={article.id}
              className={`relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-102 ${
                article.hasRead ? 'border-4 border-green-200' : 'border-4 border-blue-200'
              }`}
            >
              {/* 既読ステータスバッジ */}
              <div className="absolute top-4 right-4 z-10">
                {article.hasRead ? (
                  <div className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center shadow-lg">
                    <span className="text-lg mr-2">✅</span>
                    <span className="font-bold text-sm">よんだ！</span>
                  </div>
                ) : (
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-full flex items-center shadow-lg animate-pulse">
                    <span className="text-lg mr-2">📖</span>
                    <span className="font-bold text-sm">まだだよ</span>
                  </div>
                )}
              </div>

              {/* サムネイル画像 */}
              {article.image && (
                <div 
                  className="relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleReadArticle(article.id)}
                >
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                    <div className="bg-white/90 rounded-full p-3 shadow-lg">
                      <span className="text-2xl">📖</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-4xl">{article.emoji}</div>
                    <div>
                      <span className={`${article.categoryColor} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                        {article.category}
                      </span>
                      {article.isNew && (
                        <span className="bg-red-400 text-white px-3 py-1 rounded-full text-sm font-medium ml-2 animate-pulse">
                          あたらしい！
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    <div className="mb-1">{article.readTime}</div>
                    <div className="text-xs">{(article as any).formattedDate}</div>
                  </div>
                </div>

                <h3 
                  className={`text-xl font-bold mb-3 leading-relaxed cursor-pointer hover:opacity-80 transition-opacity ${
                    article.hasRead ? 'text-green-700' : 'text-gray-800'
                  }`}
                  onClick={() => handleReadArticle(article.id)}
                >
                  {article.title}
                </h3>

                <p className="text-gray-600 mb-4 leading-relaxed text-lg">
                  {article.summary}
                </p>
                
                {/* リアクション表示 */}
                {article.reactions && article.reactions.length > 0 && (
                  <div className="mb-4 flex items-center space-x-2">
                    <span className="text-sm text-gray-500">きみのリアクション:</span>
                    {article.reactions.map((reaction: string, index: number) => (
                      <span key={index} className="text-sm bg-gray-100 rounded-full px-3 py-1">
                        {reaction === 'good' ? '👍 わかった' : 
                         reaction === 'fun' ? '😄 たのしい' :
                         reaction === 'difficult' ? '🤔 むずかしい' :
                         reaction === 'question' ? '❓ しつもん' : reaction}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleReadArticle(article.id)}
                    className={`px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg transform hover:scale-105 ${
                      article.hasRead 
                        ? 'bg-gradient-to-r from-green-400 to-green-600 text-white hover:from-green-500 hover:to-green-700'
                        : 'bg-gradient-to-r from-blue-400 to-purple-500 text-white hover:from-blue-500 hover:to-purple-600'
                    }`}
                  >
                    {article.hasRead ? 'もういちど よむ 📖' : 'よんでみる！ 📖'}
                  </button>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleReaction(article.id, 'good')}
                      className={`p-3 rounded-full transition-colors border-2 transform ${
                        article.reactions?.includes('good')
                          ? 'bg-green-500 text-white border-green-600 scale-110 shadow-lg'
                          : 'bg-green-100 hover:bg-green-200 border-transparent hover:scale-105'
                      }`}
                      title="わかった！"
                    >
                      <span className="text-2xl">👍</span>
                    </button>
                    <button
                      onClick={() => handleReaction(article.id, 'fun')}
                      className={`p-3 rounded-full transition-colors border-2 transform ${
                        article.reactions?.includes('fun')
                          ? 'bg-yellow-500 text-white border-yellow-600 scale-110 shadow-lg'
                          : 'bg-yellow-100 hover:bg-yellow-200 border-transparent hover:scale-105'
                      }`}
                      title="たのしい！"
                    >
                      <span className="text-2xl">😄</span>
                    </button>
                    <button
                      onClick={() => handleReaction(article.id, 'difficult')}
                      className={`p-3 rounded-full transition-colors border-2 transform ${
                        article.reactions?.includes('difficult')
                          ? 'bg-orange-500 text-white border-orange-600 scale-110 shadow-lg'
                          : 'bg-yellow-100 hover:bg-yellow-200 border-transparent hover:scale-105'
                      }`}
                      title="むずかしい"
                    >
                      <span className="text-2xl">🤔</span>
                    </button>
                    <button
                      onClick={() => handleReaction(article.id, 'question')}
                      className={`p-3 rounded-full transition-colors border-2 transform ${
                        article.reactions?.includes('question')
                          ? 'bg-purple-500 text-white border-purple-600 scale-110 shadow-lg'
                          : 'bg-purple-100 hover:bg-purple-200 border-transparent hover:scale-105'
                      }`}
                      title="しつもん したい"
                    >
                      <span className="text-2xl">❓</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* 親への質問ボタン */}
        <div className="mt-8 text-center">
          <button className="bg-gradient-to-r from-pink-400 to-red-400 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-pink-500 hover:to-red-500 transition-all duration-300 shadow-lg transform hover:scale-105">
            おとうさん・おかあさんに しつもん する 💬
          </button>
        </div>

        {/* 進捗表示 */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            きみの しんぽ
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-100 rounded-2xl p-4">
              <div className="text-3xl font-bold text-green-600">
                {filteredArticles.filter(a => a.hasRead).length}
              </div>
              <div className="text-sm text-green-700 font-medium">よんだ きじ</div>
            </div>
            <div className="bg-blue-100 rounded-2xl p-4">
              <div className="text-3xl font-bold text-blue-600">
                {filteredArticles.filter(a => !a.hasRead).length}
              </div>
              <div className="text-sm text-blue-700 font-medium">まだ よんでない</div>
            </div>
            <div className="bg-purple-100 rounded-2xl p-4">
              <div className="text-3xl font-bold text-purple-600">
                {filteredArticles.length > 0 ? Math.round((filteredArticles.filter(a => a.hasRead).length / filteredArticles.length) * 100) : 0}%
              </div>
              <div className="text-sm text-purple-700 font-medium">よんだ りつ</div>
            </div>
          </div>
          
          {/* プログレスバー */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>よみおわり しんちょく</span>
              <span>{filteredArticles.filter(a => a.hasRead).length}/{filteredArticles.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500"
                style={{
                  width: `${filteredArticles.length > 0 ? (filteredArticles.filter(a => a.hasRead).length / filteredArticles.length) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}