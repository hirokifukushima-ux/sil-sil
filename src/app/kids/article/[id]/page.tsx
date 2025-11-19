'use client'

import Link from "next/link";
import { useState, useEffect } from "react";

// カテゴリ表示のヘルパー関数
function getDisplayCategory(category: string, title?: string): string {
  if (category === 'converted' && title) {
    // 既存の "converted" カテゴリの記事は、タイトルからカテゴリを推定
    const keywords = {
      'スポーツ': ['野球', 'サッカー', 'テニス', 'ゴルフ', 'バスケ', 'オリンピック', '選手', 'チーム', '試合', '勝利', '敗戦', 'FA', 'WS', 'ワールドシリーズ', 'カブス', 'パドレス', 'ドジャース'],
      '科学': ['宇宙', '火星', '探査機', 'NASA', '化石', '恐竜', '研究', '発見', '実験', '技術'],
      '政治': ['政府', '市長', '選挙', '政策', '法案', '国会', '首相', '大統領'],
      '経済': ['株価', '経済', '企業', '売上', '業績', '投資', '金融', '銀行', 'GDP'],
      '教育': ['学校', '大学', '高校', '中学', '小学', '教育', '授業', '先生', '教員', 'ストライキ', '日大'],
      '国際': ['海外', '米国', 'アメリカ', '中国', '韓国', '欧州', 'トロント', 'カナダ', 'ロサンゼルス'],
      '社会': ['事件', '事故', '裁判', '逮捕', '判決', '警察', '消防']
    };

    for (const [cat, keywordList] of Object.entries(keywords)) {
      if (keywordList.some(keyword => title.includes(keyword))) {
        return cat;
      }
    }
    return 'ニュース';
  }
  return category;
}

interface Article {
  id: number;
  convertedTitle: string;
  convertedContent: string;
  convertedSummary: string;
  category: string;
  createdAt: string;
  hasRead: boolean;
  image?: string;
}

export default function ArticleDetail({ params }: { params: Promise<{ id: string }> }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [showFurigana, setShowFurigana] = useState(true);
  const [articleId, setArticleId] = useState<string>('');
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questions, setQuestions] = useState<Array<{
    id: string;
    articleId: string;
    question: string;
    childId: string;
    createdAt: string;
    status: string;
    parentAnswer?: string;
  }>>([]);
  const [fromParent, setFromParent] = useState(false);
  
  // URLパラメータを取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isFromParent = urlParams.get('from') === 'parent';
      setFromParent(isFromParent);
    }
  }, []);

  useEffect(() => {
    params.then(({ id }) => {
      setArticleId(id);
      fetchArticle(id);
      fetchQuestions(id);
    });
  }, [params]);

  const fetchArticle = async (id: string) => {
    try {
      console.log(`🔄 記事ID:${id}の取得を開始`);

      // 認証情報を取得
      let authHeaders: HeadersInit = {};
      if (typeof window !== 'undefined') {
        const sessionData = localStorage.getItem('authSession');
        if (sessionData) {
          authHeaders = {
            'X-Auth-Session': sessionData
          };
        }
      }

      // 直接記事IDで取得を試みる（専用APIエンドポイント）
      const directResponse = await fetch(`/api/articles/${id}`, {
        headers: authHeaders
      });
      const directResult = await directResponse.json();

      if (directResult.success && directResult.article) {
        const foundArticle = directResult.article;
        const displayCategory = getDisplayCategory(foundArticle.category, foundArticle.convertedTitle);
        setArticle({
          id: foundArticle.id,
          convertedTitle: foundArticle.convertedTitle,
          convertedContent: foundArticle.convertedContent,
          convertedSummary: foundArticle.convertedSummary,
          category: displayCategory,
          createdAt: foundArticle.createdAt,
          hasRead: foundArticle.hasRead,
          image: foundArticle.image
        });
        console.log(`✅ 専用APIから記事ID:${id}を取得`);
        setLoading(false);
        return;
      }

      // フォールバック: 子ども向けAPIから記事を取得
      const response = await fetch(`/api/articles/child/8`, {
        headers: authHeaders
      });
      const result = await response.json();
      
      if (result.success) {
        const foundArticle = result.articles.find((a: {
          id: number;
          convertedTitle: string;
          convertedContent: string;
          convertedSummary: string;
          category: string;
          createdAt: string;
          hasRead: boolean;
          image?: string;
        }) => a.id.toString() === id);
        if (foundArticle) {
          const displayCategory = getDisplayCategory(foundArticle.category, foundArticle.convertedTitle);
          setArticle({
            id: foundArticle.id,
            convertedTitle: foundArticle.convertedTitle,
            convertedContent: foundArticle.convertedContent,
            convertedSummary: foundArticle.convertedSummary,
            category: displayCategory,
            createdAt: foundArticle.createdAt,
            hasRead: foundArticle.hasRead,
            image: foundArticle.image
          });
          console.log(`✅ APIから記事ID:${id}を取得`);
          setLoading(false);
          return;
        }
      }
      
      // フォールバック: デモ用サンプルデータ
      const sampleArticles: { [key: string]: Article } = {
        '1': {
          id: 1,
          convertedTitle: "うちゅうせんが かせいに たどりついたよ！",
          convertedContent: `NASAという うちゅうの けんきゅうを している ところが つくった うちゅうせんが かせいという ほしに つきました。

この うちゅうせんには すごい きかいが ついていて、かせいの いろいろなことを しらべます。

かせいは あかい いろを している ほしです。ちきゅうから とても とおくに あります。

むかし かせいに みずが あったかも しらべるよ！もし みずが あったなら、いきものも いたかもしれません。

うちゅうには まだまだ わからないことが たくさん あります。みんなで うちゅうの なぞを とこう！`,
          convertedSummary: "うちゅうせんが かせいに いって、いろいろ しらべるよ！",
          category: "かがく",
          createdAt: "2024-09-01T10:00:00Z",
          hasRead: false
        },
        '2': {
          id: 2,
          convertedTitle: "あたらしい きょうりゅうの ほねが みつかったよ！",
          convertedContent: `がくしゃの ひとたちが、いままで みたことのない あたらしい きょうりゅうの ほねを みつけました！

この きょうりゅうは とても おおきくて、つよそうな きょうりゅうだったみたいです。

きょうりゅうは いまから とても むかし、ちきゅうに すんでいた おおきな いきものです。

いろいろな しゅるいの きょうりゅうが いました。そらを とぶ きょうりゅう、みずの なかに すむ きょうりゅう、りくで あるく きょうりゅうなど。

この あたらしい きょうりゅうは どんな せいかつを していたのかな？なにを たべていたのかな？

がくしゃの ひとが いっしょうけんめい しらべています。`,
          convertedSummary: "あたらしい きょうりゅうの ほねが みつかって、がくしゃの ひとが しらべているよ！",
          category: "かがく", 
          createdAt: "2024-08-30T15:30:00Z",
          hasRead: false
        }
      };

      setTimeout(() => {
        setArticle(sampleArticles[id] || null);
        setLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('記事取得エラー:', error);
      setLoading(false);
    }
  };

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

  const fetchQuestions = async (id: string) => {
    try {
      const response = await fetch(`/api/articles/${id}/question`);
      const result = await response.json();
      
      if (result.success) {
        // 子供自身の質問のみを表示
        const childQuestions = result.questions.filter((q: {
          id: string;
          userId: string;
          status: string;
          createdAt: string;
          parentAnswer?: string;
        }) => q.userId === '123e4567-e89b-12d3-a456-426614174000');
        
        setQuestions(childQuestions);
      }
    } catch (error) {
      console.error('質問取得エラー:', error);
    }
  };

  const handleReaction = async (reaction: string) => {
    // 既に選択済みの場合は取り消し
    if (userReactions.includes(reaction)) {
      setUserReactions(prev => prev.filter(r => r !== reaction));
      return;
    }

    try {
      const response = await fetch(`/api/articles/${articleId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reaction: reaction,
          childId: '123e4567-e89b-12d3-a456-426614174000'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 成功時にリアクションを追加
        setUserReactions(prev => [...prev, reaction]);
        
        // ローカルストレージも更新
        if (typeof window !== 'undefined') {
          try {
            const { addReactionToStorage } = await import('@/lib/client-storage');
            addReactionToStorage(parseInt(articleId), reaction);
            console.log(`📱 ローカルストレージにリアクションを保存: ${reaction}`);
          } catch (error) {
            console.error('ローカルストレージリアクション更新エラー:', error);
          }
        }
        
        // 成功メッセージ（より子供向けに）
        const messages = {
          good: 'わかったんだね！すごい！ 🎉',
          fun: 'たのしんでくれて うれしいよ！ 😊',
          difficult: 'むずかしかったね。また いっしょに よんでみよう！ 📚',
          question: 'いい しつもんだね！おとうさん おかあさんに きいてみよう！ ❓'
        };
        
        // 短時間だけメッセージを表示
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse';
        toast.textContent = messages[reaction as keyof typeof messages] || result.message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 3000);
        
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('リアクション送信エラー:', error);
      alert('リアクションの送信中にエラーが発生しました');
    }
  };

  const handleMarkAsRead = async () => {
    if (article) {
      setArticle({ ...article, hasRead: true });
      
      // ローカルストレージも更新
      if (typeof window !== 'undefined') {
        try {
          const { markArticleAsRead } = await import('@/lib/client-storage');
          markArticleAsRead(article.id);
          console.log(`📱 ローカルストレージで記事ID:${article.id}を既読に設定`);
        } catch (error) {
          console.error('ローカルストレージ既読更新エラー:', error);
        }
      }
      
      alert('よんだよ！すごいね！ 🎉');
    }
  };

  const handleQuestionSubmit = async () => {
    if (!questionText.trim()) {
      alert('しつもんを かいてね！');
      return;
    }

    try {
      // 質問をAPIに送信（記事情報と一緒に）
      const response = await fetch(`/api/articles/${articleId}/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionText,
          childId: '123e4567-e89b-12d3-a456-426614174000',
          articleTitle: article?.convertedTitle,
          articleSummary: article?.convertedSummary
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // 質問リアクションも追加
        handleReaction('question');
        
        // 成功メッセージ
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-pink-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse';
        toast.textContent = 'しつもんを おくったよ！おとうさん・おかあさんが こたえてくれるかも！💬';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 4000);
        
        // フォームをリセット
        setQuestionText('');
        setShowQuestionForm(false);
        
        // 質問リストを更新
        fetchQuestions(articleId);
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('質問送信エラー:', error);
      alert('しつもんの そうしんちゅうに エラーが はっせいしました');
    }
  };

  const getCategoryEmoji = (category: string) => {
    if (category.includes('かがく') || category.includes('科学')) return '🔬';
    if (category.includes('スポーツ')) return '⚽';
    if (category.includes('ぶんか') || category.includes('文化')) return '🎨';
    if (category.includes('けいざい') || category.includes('経済')) return '💰';
    if (category.includes('せいじ') || category.includes('政治')) return '🏛️';
    if (category.includes('しゃかい') || category.includes('社会')) return '🌍';
    if (category.includes('教育')) return '📚';
    if (category.includes('国際')) return '🌏';
    return '📰';
  };

  const getCategoryColor = (category: string) => {
    if (category.includes('かがく') || category.includes('科学')) return 'bg-blue-400';
    if (category.includes('スポーツ')) return 'bg-green-400';
    if (category.includes('ぶんか') || category.includes('文化')) return 'bg-pink-400';
    if (category.includes('けいざい') || category.includes('経済')) return 'bg-yellow-400';
    if (category.includes('せいじ') || category.includes('政治')) return 'bg-red-400';
    if (category.includes('しゃかい') || category.includes('社会')) return 'bg-teal-400';
    if (category.includes('教育')) return 'bg-indigo-400';
    if (category.includes('国際')) return 'bg-cyan-400';
    return 'bg-purple-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-200 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-lg">
          <div className="text-6xl mb-4 animate-spin">🔄</div>
          <h2 className="text-2xl font-bold text-gray-800">
            きじを よみこみちゅう...
          </h2>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-200 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-lg">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            きじが みつからないよ
          </h2>
          <Link href={fromParent ? "/parent" : "/kids"} className="bg-blue-500 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-600 transition-colors">
            ニュースいちらんに もどる
          </Link>
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
            <div className="flex items-center space-x-4">
              <Link href={fromParent ? "/parent" : "/kids"} className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors">
                <span className="text-2xl">←</span>
                <span className="font-bold">もどる</span>
              </Link>
              <Link href="/kids" className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 transition-colors">
                <span className="text-2xl">🏠</span>
                <span className="font-bold text-xl">シルシル</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFurigana(!showFurigana)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  showFurigana ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                ふりがな
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                  className="bg-gray-200 hover:bg-gray-300 p-2 rounded-full transition-colors"
                >
                  A-
                </button>
                <span className="text-sm font-medium">{fontSize}px</span>
                <button
                  onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  className="bg-gray-200 hover:bg-gray-300 p-2 rounded-full transition-colors"
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 記事ヘッダー */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className={`${getCategoryColor(article.category)} text-white px-4 py-2 rounded-full font-medium flex items-center`}>
                <span className="text-lg mr-2">{getCategoryEmoji(article.category)}</span>
                {article.category}
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                📅 {formatDate(article.createdAt)}
              </span>
            </div>
            {!article.hasRead && (
              <button
                onClick={handleMarkAsRead}
                className="bg-green-500 text-white px-4 py-2 rounded-full font-medium hover:bg-green-600 transition-colors"
              >
                よんだ！
              </button>
            )}
          </div>
          
          {/* メイン画像 */}
          {article.image && (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-lg">
              <img 
                src={article.image} 
                alt={article.convertedTitle}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-gray-800 mb-4" style={{ fontSize: fontSize + 8 }}>
            {article.convertedTitle}
          </h1>
          
          <div className="text-gray-600 mb-4">
            <span className="text-lg mr-2">📅</span>
            {new Date(article.createdAt).toLocaleDateString('ja-JP')}
          </div>
        </div>

        {/* 記事本文 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 mb-6 shadow-lg">
          <div 
            className="text-gray-800 leading-relaxed"
            style={{ 
              fontSize: fontSize,
              lineHeight: fontSize * 0.08 + 1.4 
            }}
          >
            {article.convertedContent.split('\n').map((paragraph, index) => (
              <p key={index} className={paragraph.trim() ? 'mb-6' : 'mb-3'}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* 質問スレッドセクション */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            💬 しつもん と おへんじ
          </h3>
          
          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 border-l-4 border-purple-400">
                  {/* 子供の質問 */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="text-2xl">👧</div>
                    <div className="flex-1">
                      <div className="bg-purple-200 rounded-2xl p-3">
                        <div className="text-sm text-purple-600 font-medium mb-1">あなたの しつもん:</div>
                        <div className="text-gray-800">{question.question}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(question.createdAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  
                  {/* 親の回答 */}
                  {question.status === 'answered' && question.parentAnswer ? (
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">👩</div>
                      <div className="flex-1">
                        <div className="bg-green-200 rounded-2xl p-3">
                          <div className="text-sm text-green-600 font-medium mb-1">おとうさん・おかあさんから:</div>
                          <div className="text-gray-800">{question.parentAnswer}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 text-gray-500">
                      <div className="text-2xl">⏳</div>
                      <div className="text-sm">おとうさん・おかあさんが かんがえてくれているよ...</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              まだしつもんはないよ。なにかきいてみよう！
            </div>
          )}
          
          {/* 質問ボタン */}
          <div className="mt-4 text-center">
            <button 
              onClick={() => setShowQuestionForm(true)}
              className="bg-pink-400 hover:bg-pink-500 text-white px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {questions.length > 0 ? 'もっと しつもん する ➕' : 'しつもん する ❓'}
            </button>
          </div>
        </div>

        {/* リアクションセクション */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            どうだった？
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => handleReaction('good')}
              className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 text-center border-2 ${
                userReactions.includes('good')
                  ? 'bg-green-500 text-white border-green-600 scale-110 shadow-lg'
                  : 'bg-green-100 hover:bg-green-200 border-transparent'
              }`}
            >
              <div className="text-4xl mb-2">👍</div>
              <div className={`font-medium ${userReactions.includes('good') ? 'text-white' : 'text-green-700'}`}>
                わかった！
              </div>
            </button>
            <button
              onClick={() => handleReaction('fun')}
              className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 text-center border-2 ${
                userReactions.includes('fun')
                  ? 'bg-yellow-500 text-white border-yellow-600 scale-110 shadow-lg'
                  : 'bg-yellow-100 hover:bg-yellow-200 border-transparent'
              }`}
            >
              <div className="text-4xl mb-2">😄</div>
              <div className={`font-medium ${userReactions.includes('fun') ? 'text-white' : 'text-yellow-700'}`}>
                たのしい！
              </div>
            </button>
            <button
              onClick={() => handleReaction('difficult')}
              className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 text-center border-2 ${
                userReactions.includes('difficult')
                  ? 'bg-orange-500 text-white border-orange-600 scale-110 shadow-lg'
                  : 'bg-orange-100 hover:bg-orange-200 border-transparent'
              }`}
            >
              <div className="text-4xl mb-2">🤔</div>
              <div className={`font-medium ${userReactions.includes('difficult') ? 'text-white' : 'text-orange-700'}`}>
                むずかしい
              </div>
            </button>
            <button
              onClick={() => handleReaction('question')}
              className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 text-center border-2 ${
                userReactions.includes('question')
                  ? 'bg-purple-500 text-white border-purple-600 scale-110 shadow-lg'
                  : 'bg-purple-100 hover:bg-purple-200 border-transparent'
              }`}
            >
              <div className="text-4xl mb-2">❓</div>
              <div className={`font-medium ${userReactions.includes('question') ? 'text-white' : 'text-purple-700'}`}>
                しつもん
              </div>
            </button>
          </div>
        </div>

        {/* 読了表示 */}
        {article.hasRead && (
          <div className="bg-green-100 rounded-3xl p-6 text-center shadow-lg">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              よんだね！すごい！
            </h2>
            <p className="text-green-700">
              また あたらしい ニュースも よんでみよう！
            </p>
          </div>
        )}

        {/* ナビゲーション */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link 
            href={fromParent ? "/parent" : "/kids"}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            ニュースいちらんに もどる
          </Link>
          <button 
            onClick={() => setShowQuestionForm(true)}
            className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            しつもん する 💬
          </button>
        </div>

        {/* 質問フォームモーダル */}
        {showQuestionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">❓</div>
                <h2 className="text-2xl font-bold text-gray-800">しつもん する</h2>
                <p className="text-gray-600 mt-2">この きじについて きいてみよう！</p>
              </div>
              
              {/* 記事引用 */}
              <div className="bg-gray-100 rounded-2xl p-4 mb-6">
                <div className="text-sm text-gray-500 mb-2">きじ:</div>
                <div className="text-lg font-medium text-gray-800 mb-2">{article?.convertedTitle}</div>
                <div className="text-sm text-gray-600">{article?.convertedSummary}</div>
              </div>
              
              {/* 質問入力 */}
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="なにが しりたい？
れい: 「なぜ こんなことが おこったの？」"
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-2xl focus:border-pink-400 focus:outline-none resize-none text-lg"
                style={{ fontSize: '18px' }}
              />
              
              {/* ボタン */}
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowQuestionForm(false);
                    setQuestionText('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-4 rounded-2xl font-bold text-lg transition-colors"
                >
                  やめる
                </button>
                <button
                  onClick={handleQuestionSubmit}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg transition-colors"
                >
                  おくる 💬
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}