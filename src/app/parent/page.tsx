'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserType, clearUserType, isAuthenticated, requireAuth } from "../../lib/auth";

export default function ParentDashboard() {
  const router = useRouter();
  const [newArticleUrl, setNewArticleUrl] = useState('');
  const [selectedChild, setSelectedChild] = useState('child1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [childQuestions, setChildQuestions] = useState<any[]>([]);
  const [editingChild, setEditingChild] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // アーカイブ関連の状態
  const [currentView, setCurrentView] = useState<'recent' | 'archived'>('recent');
  const [archivedArticles, setArchivedArticles] = useState<any[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [isArchiveMode, setIsArchiveMode] = useState(false);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  // 子どものデータ
  const [children, setChildren] = useState([
    { id: 'child1', name: '太郎', age: 8, grade: '小2' },
    { id: 'child2', name: '花子', age: 10, grade: '小4' }
  ]);

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

  // 子どもの年齢を更新
  const updateChildAge = (childId: string, newAge: number) => {
    setChildren(prev => prev.map(child => 
      child.id === childId 
        ? { ...child, age: newAge, grade: getGradeFromAge(newAge) }
        : child
    ));
    setEditingChild(null);
  };

  // アクセス制御チェック
  useEffect(() => {
    if (!requireAuth('parent')) {
      router.push('/login');
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  // 最近の記事を取得
  useEffect(() => {
    if (!isAuthorized) return;
    
    const fetchRecentArticles = async () => {
      try {
        console.log('記事取得を開始...');
        const response = await fetch('/api/articles/recent');
        const result = await response.json();
        
        console.log('記事取得結果:', result);
        
        if (result.success) {
          setRecentArticles(result.articles);
        } else {
          console.error('記事取得失敗:', result.error);
        }
      } catch (error) {
        console.error('最近の記事取得エラー:', error);
      }
    };

    fetchRecentArticles();
  }, [isAuthorized]);

  // 子供の質問を取得
  useEffect(() => {
    if (!isAuthorized) return;
    const fetchChildQuestions = async () => {
      try {
        const allQuestions: any[] = [];
        
        // 各記事の質問を取得
        for (const article of recentArticles) {
          const response = await fetch(`/api/articles/${article.id}/question`);
          const result = await response.json();
          
          if (result.success && result.questions.length > 0) {
            allQuestions.push(...result.questions.map((q: any) => ({
              ...q,
              articleTitle: article.convertedTitle || article.originalTitle
            })));
          }
        }
        
        // 作成日時順でソート
        allQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setChildQuestions(allQuestions);
      } catch (error) {
        console.error('質問取得エラー:', error);
      }
    };

    if (recentArticles.length > 0 && isAuthorized) {
      fetchChildQuestions();
    }
  }, [recentArticles, isAuthorized]);

  // ビュー切り替え時の処理
  useEffect(() => {
    if (currentView === 'archived' && isAuthorized) {
      fetchArchivedArticles();
    }
    // ビューが変わったら選択をクリア
    setSelectedArticles([]);
    setIsArchiveMode(false);
  }, [currentView, isAuthorized]);

  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newArticleUrl.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const selectedChildData = children.find(c => c.id === selectedChild);
        const childAge = selectedChildData?.age || 8;
        
        const response = await fetch('/api/articles/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: newArticleUrl,
            childAge: childAge
          }),
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          alert(`✅ 記事の変換が完了しました！\n\n変換後タイトル: ${result.article.convertedTitle}\n\n子供がニュースページで読めるようになりました！`);
          setNewArticleUrl('');
          
          // 記事リストを更新
          const recentResponse = await fetch('/api/articles/recent');
          const recentResult = await recentResponse.json();
          if (recentResult.success) {
            setRecentArticles(recentResult.articles);
          }
        } else {
          throw new Error(result.error || 'サーバーエラーが発生しました');
        }
      } catch (error) {
        console.error('記事登録エラー:', error);
        alert(`❌ エラー: ${error instanceof Error ? error.message : '記事の登録中にエラーが発生しました'}\n\n再度お試しください。`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAnswerQuestion = async (questionId: string, answer: string, articleId: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/question`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: questionId,
          answer: answer
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // ローカル状態を更新
        setChildQuestions(prev => 
          prev.map(q => 
            q.id === questionId 
              ? { ...q, status: 'answered', parentAnswer: answer }
              : q
          )
        );
        alert('✅ 回答を送信しました！');
      } else {
        throw new Error(result.error || 'サーバーエラーが発生しました');
      }
    } catch (error) {
      console.error('回答送信エラー:', error);
      alert(`❌ エラー: ${error instanceof Error ? error.message : '回答の送信中にエラーが発生しました'}`);
    }
  };

  const handleLogout = () => {
    clearUserType();
    router.push('/login');
  };

  // アーカイブ記事を取得
  const fetchArchivedArticles = async () => {
    try {
      const response = await fetch('/api/articles/archive');
      const result = await response.json();
      
      if (result.success) {
        setArchivedArticles(result.articles);
      }
    } catch (error) {
      console.error('アーカイブ記事取得エラー:', error);
    }
  };

  // 記事のアーカイブ/アーカイブ解除
  const handleArchiveAction = async (action: 'archive' | 'unarchive') => {
    if (selectedArticles.length === 0) {
      alert(`${action === 'archive' ? 'アーカイブ' : 'アーカイブ解除'}する記事を選択してください`);
      return;
    }

    setIsArchiveLoading(true);
    
    try {
      const response = await fetch('/api/articles/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleIds: selectedArticles,
          action: action
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ ${result.message}`);
        
        // 記事リストを更新
        if (currentView === 'recent') {
          const recentResponse = await fetch('/api/articles/recent');
          const recentResult = await recentResponse.json();
          if (recentResult.success) {
            setRecentArticles(recentResult.articles);
          }
        } else {
          await fetchArchivedArticles();
        }
        
        // 選択をクリア
        setSelectedArticles([]);
        setIsArchiveMode(false);
      } else {
        alert(`❌ エラー: ${result.message}`);
        if (result.errors && result.errors.length > 0) {
          console.error('詳細エラー:', result.errors);
        }
      }
    } catch (error) {
      console.error('アーカイブ操作エラー:', error);
      alert('アーカイブ操作中にエラーが発生しました');
    } finally {
      setIsArchiveLoading(false);
    }
  };

  // 記事選択のハンドル
  const handleArticleSelect = (articleId: number) => {
    setSelectedArticles(prev => {
      if (prev.includes(articleId)) {
        return prev.filter(id => id !== articleId);
      } else {
        return [...prev, articleId];
      }
    });
  };

  // 全選択/全解除
  const handleSelectAll = () => {
    const currentArticles = currentView === 'recent' ? recentArticles : archivedArticles;
    if (selectedArticles.length === currentArticles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(currentArticles.map(article => article.id));
    }
  };

  // 未認証の場合は何も表示しない（リダイレクト中）
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
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                📰 KnowNews
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                親ダッシュボード
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 子供選択 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">子供を選択</h2>
          <div className="flex space-x-4">
            {children.map((child) => (
              <div key={child.id} className="relative">
                <button
                  onClick={() => setSelectedChild(child.id)}
                  className={`p-4 rounded-lg border-2 transition-colors w-full ${
                    selectedChild === child.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">👧</div>
                  <div className="font-medium">{child.name}</div>
                  {editingChild === child.id ? (
                    <div className="text-sm mt-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={child.age}
                        onChange={(e) => updateChildAge(child.id, parseInt(e.target.value))}
                        className="px-2 py-1 border rounded text-gray-700 bg-white"
                        autoFocus
                        onBlur={() => setEditingChild(null)}
                      >
                        {Array.from({length: 10}, (_, i) => i + 6).map(age => (
                          <option key={age} value={age}>{age}歳 ({getGradeFromAge(age)})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">{child.age}歳 ({child.grade})</div>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingChild(child.id);
                  }}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm"
                  title="年齢を編集"
                >
                  ✏️
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            {/* 記事登録フォーム */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                新しい記事を共有
              </h2>
              <form onSubmit={handleSubmitArticle} className="space-y-4">
                <div>
                  <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 mb-2">
                    記事のURL
                  </label>
                  <input
                    type="url"
                    id="article-url"
                    value={newArticleUrl}
                    onChange={(e) => setNewArticleUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto py-2 px-6 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">🔄</span>
                      変換中...
                    </>
                  ) : (
                    '記事を追加'
                  )}
                </button>
              </form>
            </div>

            {/* 記事管理 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    記事管理
                  </h2>
                  
                  {/* アーカイブモードボタン */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsArchiveMode(!isArchiveMode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isArchiveMode
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isArchiveMode ? '選択モード終了' : '選択モード'}
                    </button>
                  </div>
                </div>

                {/* ビュー切り替えタブ */}
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCurrentView('recent')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      currentView === 'recent'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    最近の記事 ({recentArticles.length})
                  </button>
                  <button
                    onClick={() => setCurrentView('archived')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      currentView === 'archived'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    アーカイブ ({archivedArticles.length})
                  </button>
                </div>

                {/* アーカイブモード時のアクションバー */}
                {isArchiveMode && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handleSelectAll}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {selectedArticles.length === (currentView === 'recent' ? recentArticles : archivedArticles).length
                            ? '全て解除'
                            : '全て選択'
                          }
                        </button>
                        <span className="text-sm text-gray-600">
                          {selectedArticles.length}件選択中
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {currentView === 'recent' ? (
                          <button
                            onClick={() => handleArchiveAction('archive')}
                            disabled={selectedArticles.length === 0 || isArchiveLoading}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {isArchiveLoading ? '処理中...' : 'アーカイブ'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveAction('unarchive')}
                            disabled={selectedArticles.length === 0 || isArchiveLoading}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {isArchiveLoading ? '処理中...' : 'アーカイブ解除'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="divide-y divide-gray-200">
                {(currentView === 'recent' ? recentArticles : archivedArticles).map((article) => (
                  <div key={article.id} className={`p-6 transition-colors ${
                    selectedArticles.includes(article.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start space-x-4">
                      {/* チェックボックス（アーカイブモード時のみ表示） */}
                      {isArchiveMode && (
                        <div className="flex-shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={selectedArticles.includes(article.id)}
                            onChange={() => handleArticleSelect(article.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {article.convertedTitle || article.originalTitle}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {article.category}
                          </span>
                          <span>{new Date(article.createdAt).toLocaleDateString('ja-JP')}</span>
                          {currentView === 'archived' && article.archivedAt && (
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                              📦 {new Date(article.archivedAt).toLocaleDateString('ja-JP')}にアーカイブ
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded ${
                            article.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {article.status === 'completed' ? '変換完了' : '処理中'}
                          </span>
                          {article.siteName && (
                            <span className="text-gray-400">
                              from {article.siteName}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center space-x-4">
                          {children.map((child) => (
                            <div key={child.id} className="flex items-center text-sm">
                              <span className="text-gray-600 mr-2">{child.name}:</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                article.hasRead
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {article.hasRead ? '読了' : '未読'}
                              </span>
                            </div>
                          ))}
                        </div>
                        {article.reactions && article.reactions.length > 0 && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-sm text-gray-500">リアクション:</span>
                            {article.reactions.map((reaction: string, index: number) => (
                              <span key={index} className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {reaction === 'good' ? '👍 わかった' : 
                                 reaction === 'difficult' ? '🤔 むずかしい' :
                                 reaction === 'question' ? '❓ しつもん' : reaction}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <Link href={`/kids/article/${article.id}?from=parent`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                          プレビュー
                        </Link>
                        <button 
                          onClick={() => window.open(article.originalUrl, '_blank')}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          元記事
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 子供からの質問 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  ❓ 子供からの質問
                  {childQuestions.filter(q => q.status === 'pending').length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-sm">
                      {childQuestions.filter(q => q.status === 'pending').length}件未回答
                    </span>
                  )}
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {childQuestions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    まだ質問はありません
                  </div>
                ) : (
                  childQuestions.map((question) => {
                    const child = children.find(c => c.id === question.childId);
                    return (
                      <div key={question.id} className={`p-6 ${question.status === 'pending' ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">👧</div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {child?.name || question.childId}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(question.createdAt).toLocaleString('ja-JP')}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            question.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {question.status === 'pending' ? '未回答' : '回答済み'}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-sm text-gray-500 mb-1">記事:</div>
                          <div className="text-sm font-medium text-indigo-600">
                            {question.articleTitle}
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="text-sm text-gray-500 mb-1">質問:</div>
                          <div className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                            {question.question}
                          </div>
                        </div>
                        
                        {question.status === 'pending' ? (
                          <div className="mt-4">
                            <textarea
                              id={`answer-${question.id}`}
                              placeholder="子供への回答を入力してください..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                              rows={3}
                              onChange={(e) => {
                                question.pendingAnswer = e.target.value;
                              }}
                            />
                            <button
                              onClick={() => {
                                const textarea = document.querySelector(`#answer-${question.id}`) as HTMLTextAreaElement;
                                const answer = textarea?.value;
                                if (answer?.trim()) {
                                  handleAnswerQuestion(question.id, answer.trim(), question.articleId);
                                }
                              }}
                              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                            >
                              回答を送信
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4">
                            <div className="text-sm text-gray-500 mb-1">あなたの回答:</div>
                            <div className="text-gray-900 bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                              {question.parentAnswer}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-8">
            {/* 統計 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                今月の統計
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">共有した記事</span>
                  <span className="text-2xl font-bold text-indigo-600">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">読了記事</span>
                  <span className="text-2xl font-bold text-green-600">8</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">読了率</span>
                  <span className="text-2xl font-bold text-purple-600">67%</span>
                </div>
              </div>
            </div>

            {/* カテゴリ */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                カテゴリ別記事数
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">科学</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">スポーツ</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">テクノロジー</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">2</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">文化</span>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">2</span>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                クイックアクション
              </h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                  📊 詳細レポートを見る
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                  ⚙️ 子供の設定を変更
                </button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                  📝 フィードバックを送る
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}