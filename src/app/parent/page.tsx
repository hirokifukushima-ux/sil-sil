'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearUserType, isParentUser, getAuthSession, syncWithSupabaseAuth } from "../../lib/auth";
import SaveAccountBanner from "@/components/auth/SaveAccountBanner";
import BottomNav from "@/components/navigation/BottomNav";

// カテゴリ表示のヘルパー関数
function getDisplayCategory(category: string, originalTitle?: string): string {
  if (category === 'converted' && originalTitle) {
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
      if (keywordList.some(keyword => originalTitle.includes(keyword))) {
        return cat;
      }
    }
    return 'ニュース';
  }
  return category;
}

export default function ParentDashboard() {
  const router = useRouter();
  const [newArticleUrl, setNewArticleUrl] = useState('');
  const [selectedChild, setSelectedChild] = useState('123e4567-e89b-12d3-a456-426614174000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentArticles, setRecentArticles] = useState<Array<{
    id: number;
    convertedTitle: string;
    originalTitle?: string;
    originalUrl?: string;
    category: string;
    createdAt: string;
    hasRead: boolean;
    reactions: string[];
    isArchived?: boolean;
    archivedAt?: string;
    status: string;
    siteName?: string;
    image?: string;
    convertedSummary?: string;
  }>>([]);
  const [childQuestions, setChildQuestions] = useState<Array<{
    id: string;
    articleId: string;
    question: string;
    childId: string;
    status: string;
    createdAt: string;
    parentAnswer?: string;
    pendingAnswer?: string;
    articleTitle: string;
  }>>([]);
  const [editingChild, setEditingChild] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // 統計データ
  const [stats, setStats] = useState({
    totalArticles: 0,
    readArticles: 0,
    readRate: 0,
    categoryStats: {} as Record<string, number>
  });
  
  // アーカイブ関連の状態
  const [currentView, setCurrentView] = useState<'recent' | 'archived'>('recent');
  const [archivedArticles, setArchivedArticles] = useState<Array<{
    id: number;
    convertedTitle: string;
    originalTitle?: string;
    originalUrl?: string;
    category: string;
    createdAt: string;
    hasRead: boolean;
    reactions: string[];
    isArchived?: boolean;
    archivedAt?: string;
    status: string;
    siteName?: string;
    image?: string;
    convertedSummary?: string;
  }>>([]);
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [isArchiveMode, setIsArchiveMode] = useState(false);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [parentName, setParentName] = useState<string>('');

  // トークン使用状況
  const [tokenUsage, setTokenUsage] = useState<{
    totalTokensUsed: number;
    tokenLimit: number;
    remainingTokens: number;
    usagePercentage: number;
    tokensResetAt: string;
    estimatedCost: {
      usd: number;
      jpy: number;
    };
  } | null>(null);

  // 子どものデータ
  const [children, setChildren] = useState<Array<{
    id: string;
    name: string;
    age: number;
    grade: string;
  }>>([]);

  // 統計を計算する関数
  const calculateStats = (articles: typeof recentArticles) => {
    const totalArticles = articles.length;
    const readArticles = articles.filter(article => article.hasRead).length;
    const readRate = totalArticles > 0 ? Math.round((readArticles / totalArticles) * 100) : 0;
    
    // カテゴリ別統計
    const categoryStats: Record<string, number> = {};
    articles.forEach(article => {
      const category = getDisplayCategory(article.category, article.originalTitle);
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    setStats({
      totalArticles,
      readArticles,
      readRate,
      categoryStats
    });
  };

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

  // 記事詳細ページに遷移
  const handleNavigateToArticle = (articleId: number) => {
    router.push(`/kids/article/${articleId}?from=parent`);
  };

  // アクセス制御チェック & Supabase Authセッション同期
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 親ダッシュボード：認証チェック開始');

      // Supabase Authセッションと同期
      await syncWithSupabaseAuth();

      if (!isParentUser()) {
        console.log('❌ 親ダッシュボード：認証失敗、ログインページへリダイレクト');
        router.push('/login');
        return;
      }
      console.log('✅ 親ダッシュボード：認証成功');
      setIsAuthorized(true);
    };

    checkAuth();
  }, [router]);

  // 最近の記事を取得（子ども選択に応じてフィルタリング）
  useEffect(() => {
    if (!isAuthorized) return;
    if (!selectedChild) return; // 子どもが選択されていない場合は何もしない

    const fetchRecentArticles = async () => {
      try {
        const selectedChildData = children.find(c => c.id === selectedChild);
        console.log(`🔄 親ページ：${selectedChildData?.name || '選択した子ども'}の記事取得を開始...`);

        // 認証情報を取得
        const session = getAuthSession();
        if (!session || !session.userId) {
          console.error('❌ 認証情報がありません');
          return;
        }

        // 選択した子どもの記事を取得（childIdベースで個別管理）
        const childId = selectedChild;
        const fetchUrl = `/api/articles/recent?parentId=${session.userId}&childId=${childId}&limit=100&includeArchived=false`;
        console.log('🔍 フェッチURL:', fetchUrl);

        const response = await fetch(fetchUrl, {
          headers: {
            'X-Auth-Session': JSON.stringify({
              userId: session.userId,
              userType: session.userType
            }),
          },
        });
        const result = await response.json();

        if (result.success && result.articles.length > 0) {
          // APIがchildIdでフィルタリング済み、追加のフィルタリングは不要
          setRecentArticles(result.articles);
          calculateStats(result.articles);
          console.log(`✅ ${selectedChildData?.name}用の記事${result.articles.length}件を取得完了`);
        } else {
          console.warn('⚠️ データベースから記事を取得できませんでした');
          setRecentArticles([]);
          calculateStats([]);
        }
      } catch (error) {
        console.error('❌ 親ページ記事取得エラー:', error);
        setRecentArticles([]);
        calculateStats([]);
      }
    };

    fetchRecentArticles();
  }, [isAuthorized, selectedChild, children]);

  // 子供一覧を取得
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
          // デフォルトで最初の子供を選択
          if (formattedChildren.length > 0) {
            setSelectedChild(formattedChildren[0].id);
          }
        }
      } catch (error) {
        console.error('子供一覧取得エラー:', error);
      }
    };

    fetchChildren();
  }, [isAuthorized]);

  // 親の名前を取得
  useEffect(() => {
    if (!isAuthorized) return;
    const session = getAuthSession();
    if (session?.displayName) {
      setParentName(session.displayName);
    }
  }, [isAuthorized]);

  // トークン使用状況を取得
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchTokenUsage = async () => {
      try {
        const session = getAuthSession();
        if (!session) return;

        const response = await fetch('/api/user/token-usage', {
          headers: {
            'X-Auth-Session': JSON.stringify({
              userId: session.userId,
              userType: session.userType
            }),
          },
        });
        const result = await response.json();

        if (result.success && result.tokenUsage) {
          setTokenUsage(result.tokenUsage);
          console.log('✅ トークン使用状況を取得:', result.tokenUsage);
        } else {
          console.warn('⚠️ トークン使用状況の取得に失敗しました');
        }
      } catch (error) {
        console.error('❌ トークン使用状況取得エラー:', error);
      }
    };

    fetchTokenUsage();
  }, [isAuthorized]);

  // 子供の質問を取得
  useEffect(() => {
    if (!isAuthorized) return;
    const fetchChildQuestions = async () => {
      try {
        const allQuestions: Array<{
          id: string;
          articleId: string;
          question: string;
          childId: string;
          status: string;
          createdAt: string;
          parentAnswer?: string;
          pendingAnswer?: string;
          articleTitle: string;
        }> = [];
        
        // 各記事の質問を取得
        for (const article of recentArticles) {
          const response = await fetch(`/api/articles/${article.id}/question`);
          const result = await response.json();
          
          if (result.success && result.questions.length > 0) {
            allQuestions.push(...result.questions.map((q: {
              id: string;
              articleId: string;
              question: string;
              childId: string;
              status: string;
              createdAt: string;
              parentAnswer?: string;
              pendingAnswer?: string;
            }) => ({
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
          setNewArticleUrl('');

          // 記事リストを更新
          const session = getAuthSession();
          const recentResponse = await fetch('/api/articles/recent', {
            headers: {
              'X-Auth-Session': JSON.stringify(session),
            },
          });
          const recentResult = await recentResponse.json();
          if (recentResult.success) {
            setRecentArticles(recentResult.articles);
            calculateStats(recentResult.articles);
          }

          // トークン使用状況を更新
          const tokenResponse = await fetch('/api/user/token-usage', {
            headers: {
              'X-Auth-Session': JSON.stringify(session),
            },
          });
          const tokenResult = await tokenResponse.json();
          if (tokenResult.success && tokenResult.tokenUsage) {
            setTokenUsage(tokenResult.tokenUsage);
            console.log('✅ トークン使用状況を更新しました');
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

  // アーカイブ記事を取得（ローカルストレージ優先）
  const fetchArchivedArticles = async () => {
    try {
      let archivedArticles: Array<{
        id: number;
        convertedTitle: string;
        originalTitle?: string;
        originalUrl?: string;
        category: string;
        createdAt: string;
        hasRead: boolean;
        reactions: string[];
        isArchived?: boolean;
        archivedAt?: string;
        status: string;
        siteName?: string;
        convertedSummary?: string;
      }> = [];
      
      // まずローカルストレージからアーカイブ記事を取得
      if (typeof window !== 'undefined') {
        try {
          const { getStoredArticles } = await import('@/lib/client-storage');
          const storedArticles = getStoredArticles();
          archivedArticles = storedArticles.filter(article => article.isArchived);
          console.log(`📱 ローカルストレージから${archivedArticles.length}件のアーカイブ記事を取得`);
        } catch (error) {
          console.error('ローカルストレージアーカイブ記事取得エラー:', error);
        }
      }
      
      // APIからもアーカイブ記事を取得（フォールバック）
      try {
        const response = await fetch('/api/articles/archive');
        const result = await response.json();
        
        if (result.success && result.articles.length > 0) {
          // APIのアーカイブ記事をローカルストレージの記事と統合
          const apiArchivedArticles = result.articles.filter((apiArticle: {
            id: number;
            convertedTitle: string;
            convertedSummary: string;
            category: string;
            createdAt: string;
            hasRead: boolean;
            convertedContent: string;
            reactions: string[];
          }) => 
            !archivedArticles.some(stored => stored.id === apiArticle.id)
          );
          archivedArticles = [...archivedArticles, ...apiArchivedArticles];
          console.log(`🔄 APIアーカイブ記事${apiArchivedArticles.length}件を統合、総計${archivedArticles.length}件`);
        }
      } catch (apiError) {
        console.warn('APIアーカイブ記事取得エラー（ローカルストレージを使用）:', apiError);
      }
      
      // アーカイブ日時順でソート
      archivedArticles.sort((a, b) => {
        const aTime = a.archivedAt ? new Date(a.archivedAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.archivedAt ? new Date(b.archivedAt).getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
      
      setArchivedArticles(archivedArticles);
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
        // ローカルストレージも更新
        if (typeof window !== 'undefined') {
          try {
            const { getStoredArticles, saveStoredArticles } = await import('@/lib/client-storage');
            const storedArticles = getStoredArticles();
            const updatedArticles = storedArticles.map(article => {
              if (selectedArticles.includes(article.id)) {
                return {
                  ...article,
                  isArchived: action === 'archive',
                  archivedAt: action === 'archive' ? new Date().toISOString() : undefined
                };
              }
              return article;
            });
            saveStoredArticles(updatedArticles);
            console.log(`📱 ローカルストレージで${selectedArticles.length}件の記事を${action === 'archive' ? 'アーカイブ' : 'アーカイブ解除'}しました`);
          } catch (error) {
            console.error('ローカルストレージアーカイブ更新エラー:', error);
          }
        }
        
        alert(`✅ ${result.message}`);
        
        // 記事リストを更新
        if (currentView === 'recent') {
          const session = getAuthSession();
          const recentResponse = await fetch('/api/articles/recent', {
            headers: {
              'X-Auth-Session': JSON.stringify(session),
            },
          });
          const recentResult = await recentResponse.json();
          if (recentResult.success) {
            setRecentArticles(recentResult.articles);
            calculateStats(recentResult.articles);
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
      <header className="bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 1段目：ロゴと親の名前 */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <Link href="/parent" className="flex items-center">
              <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-baseline">
                🏠 シルシル
                <span className="text-xs lg:text-sm font-normal text-gray-500 ml-1">for parent</span>
              </span>
            </Link>
            <div className="text-sm lg:text-base text-gray-700 font-medium">
              👤 {parentName || 'ゲスト'} さん
            </div>
          </div>

          {/* 2段目：ダッシュボードとログアウト */}
          <div className="flex items-center justify-between py-2">
            <div className="text-xs lg:text-sm text-gray-600">
              親ダッシュボード
            </div>
            <button
              onClick={handleLogout}
              className="text-xs lg:text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* アカウント保存バナー（メールアドレス未設定の場合のみ表示） */}
        {!getAuthSession()?.email && <SaveAccountBanner />}

        {/* 子供選択 - コンパクトなタブ形式 */}
        <div className="bg-white border-b border-gray-200 mb-6">
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
                  {editingChild === child.id ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={child.age}
                        onChange={(e) => updateChildAge(child.id, parseInt(e.target.value))}
                        className="px-1 py-0.5 border rounded text-gray-700 bg-white text-xs mt-0.5"
                        autoFocus
                        onBlur={() => setEditingChild(null)}
                      >
                        {Array.from({length: 10}, (_, i) => i + 6).map(age => (
                          <option key={age} value={age}>{age}歳 ({getGradeFromAge(age)})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {child.age}歳 ({child.grade})
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingChild(child.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-gray-600 text-xs transition-opacity"
                  title="年齢を編集"
                >
                  ✏️
                </button>
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            {/* 記事追加方法選択 - モバイル最適化 */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-4 lg:mb-8 lg:block hidden">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                新しい記事を共有
              </h2>

              {/* 方法選択ボタン - デスクトップのみ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Link
                  href="/parent/news"
                  className="flex items-center p-4 border-2 border-indigo-200 rounded-lg hover:border-indigo-400 transition-colors group"
                >
                  <div className="text-3xl mr-4">📰</div>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-indigo-600">
                      ニュースから選択
                    </h3>
                    <p className="text-sm text-gray-600">
                      最新ニュース一覧から記事を選んで変換
                    </p>
                  </div>
                </Link>

                <div className="flex items-center p-4 border-2 border-gray-200 rounded-lg">
                  <div className="text-3xl mr-4">🔗</div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      URLで直接追加
                    </h3>
                    <p className="text-sm text-gray-600">
                      記事のURLを入力して変換
                    </p>
                  </div>
                </div>

                <Link
                  href="/parent/children"
                  className="flex items-center p-4 border-2 border-green-200 rounded-lg hover:border-green-400 transition-colors group"
                >
                  <div className="text-3xl mr-4">👨‍👩‍👧‍👦</div>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-green-600">
                      子アカウント管理
                    </h3>
                    <p className="text-sm text-gray-600">
                      お子様のアカウントを作成・管理
                    </p>
                  </div>
                </Link>
              </div>

              {/* URL入力フォーム */}
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
              {/* カード型記事リスト - モバイル最適化 */}
              <div className="p-3 lg:p-0 space-y-3 lg:space-y-0 lg:divide-y lg:divide-gray-200">
                {(currentView === 'recent' ? recentArticles : archivedArticles).map((article) => (
                  <div key={article.id} className={`lg:p-6 transition-all duration-200 ${
                    selectedArticles.includes(article.id)
                      ? 'bg-blue-50 lg:bg-blue-50'
                      : 'bg-white lg:bg-transparent lg:hover:bg-gray-50'
                  } rounded-xl lg:rounded-none shadow-sm lg:shadow-none border lg:border-0 border-gray-100`}>
                    <div className="p-4 lg:p-0">
                      <div className="flex items-start gap-3 lg:gap-4">
                        {/* チェックボックス（アーカイブモード時のみ） */}
                        {isArchiveMode && (
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={selectedArticles.includes(article.id)}
                              onChange={() => handleArticleSelect(article.id)}
                              className="w-5 h-5 lg:w-4 lg:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                        )}

                        {/* サムネイル画像 */}
                        <div
                          className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToArticle(article.id);
                          }}
                        >
                          {article.image ? (
                            <img
                              src={article.image}
                              alt={article.convertedTitle || article.originalTitle}
                              className="w-20 h-20 lg:w-24 lg:h-16 object-cover rounded-lg shadow-sm border border-gray-200"
                            />
                          ) : (
                            <div className="w-20 h-20 lg:w-24 lg:h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                              <span className="text-gray-400 text-2xl lg:text-lg">📰</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-base lg:text-lg font-semibold text-gray-900 mb-1.5 lg:mb-2 cursor-pointer hover:text-blue-600 transition-colors line-clamp-2 active:text-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToArticle(article.id);
                            }}
                          >
                            {article.convertedTitle || article.originalTitle}
                          </h3>

                          {article.convertedSummary && (
                            <p className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3 leading-relaxed line-clamp-2 lg:line-clamp-none">
                              📝 {article.convertedSummary}
                            </p>
                          )}

                          {/* メタ情報 - モバイル最適化 */}
                          <div className="flex flex-wrap items-center gap-2 text-xs lg:text-sm">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 lg:py-1 rounded-md font-medium">
                              {getDisplayCategory(article.category, article.originalTitle)}
                            </span>
                            <span className="text-gray-500">
                              {new Date(article.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                            </span>
                            {currentView === 'archived' && article.archivedAt && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-0.5 lg:py-1 rounded-md text-xs">
                                📦 アーカイブ済み
                              </span>
                            )}
                            <span className={`px-2 py-0.5 lg:py-1 rounded-md text-xs ${
                              article.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {article.status === 'completed' ? '完了' : '処理中'}
                            </span>
                          </div>

                          {/* 読了ステータス - 該当する年齢の子どものみ表示 */}
                          {children.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {children
                                .filter(child => child.id === article.childId) // 記事の対象子どものみ（個別管理）
                                .map((child) => (
                                  <div key={child.id} className="flex items-center text-xs">
                                    <span className="text-gray-600 mr-1">{child.name}:</span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                      article.hasRead
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {article.hasRead ? '✓' : '•'}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* リアクション */}
                          {article.reactions && article.reactions.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {article.reactions.map((reaction: string, index: number) => (
                                <span key={index} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
                                  {reaction === 'good' ? '👍' :
                                   reaction === 'difficult' ? '🤔' :
                                   reaction === 'question' ? '❓' : reaction}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* アクションボタン - モバイルで下部に配置 */}
                      <div className="mt-3 pt-3 border-t border-gray-100 lg:border-0 lg:mt-0 lg:pt-0 flex gap-2 lg:absolute lg:top-6 lg:right-6">
                        <Link
                          href={`/kids/article/${article.id}?from=parent`}
                          className="flex-1 lg:flex-initial text-center lg:text-left px-4 py-2 lg:px-0 lg:py-0 bg-indigo-50 lg:bg-transparent text-indigo-600 hover:text-indigo-800 text-sm font-medium rounded-lg lg:rounded-none transition-colors"
                        >
                          📖 プレビュー
                        </Link>
                        <button
                          onClick={() => window.open(article.originalUrl, '_blank')}
                          className="flex-1 lg:flex-initial text-center lg:text-left px-4 py-2 lg:px-0 lg:py-0 bg-gray-50 lg:bg-transparent text-gray-600 hover:text-gray-800 text-sm rounded-lg lg:rounded-none transition-colors"
                        >
                          🔗 元記事
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
            {/* トークン使用状況 */}
            {tokenUsage && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  🎫 トークン使用状況
                </h3>
                <div className="space-y-4">
                  {/* 使用量表示 */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {tokenUsage.remainingTokens.toLocaleString()} / {tokenUsage.tokenLimit.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      残り / 上限
                    </div>
                  </div>

                  {/* プログレスバー */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        tokenUsage.usagePercentage >= 90
                          ? 'bg-red-500'
                          : tokenUsage.usagePercentage >= 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(tokenUsage.usagePercentage, 100)}%` }}
                    />
                  </div>

                  {/* リセット日時 */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500">
                      次回リセット: {new Date(tokenUsage.tokensResetAt).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  {/* 警告メッセージ */}
                  {tokenUsage.usagePercentage >= 90 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <span className="text-red-600 mr-2">⚠️</span>
                        <p className="text-xs text-red-800">
                          トークン使用量が上限に近づいています。リセット日まで記事変換ができなくなる可能性があります。
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 統計 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                今月の統計
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">共有した記事</span>
                  <span className="text-2xl font-bold text-indigo-600">{stats.totalArticles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">読了記事</span>
                  <span className="text-2xl font-bold text-green-600">{stats.readArticles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">読了率</span>
                  <span className="text-2xl font-bold text-purple-600">{stats.readRate}%</span>
                </div>
              </div>
            </div>

            {/* カテゴリ */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                カテゴリ別記事数
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.categoryStats).length > 0 ? (
                  Object.entries(stats.categoryStats).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-gray-600">{category}</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        category === '科学' ? 'bg-blue-100 text-blue-800' :
                        category === 'スポーツ' ? 'bg-green-100 text-green-800' :
                        category === 'テクノロジー' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {count}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    まだ記事がありません
                  </div>
                )}
              </div>
            </div>

            {/* クイックアクション */}
            {/* <div className="bg-white rounded-lg shadow p-6">
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
            </div> */}
          </div>
        </div>
      </div>

      {/* フローティングアクションボタン - モバイルのみ */}
      <Link
        href="/parent/news"
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-40 hover:shadow-xl transition-all duration-200 active:scale-95"
      >
        ➕
      </Link>

      {/* ボトムナビゲーション */}
      <BottomNav />
    </div>
  );
}