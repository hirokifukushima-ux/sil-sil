'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { requireAuth } from "../../../lib/auth";

interface Question {
  id: string;
  articleId: string;
  articleTitle: string;
  question: string;
  childId: string;
  createdAt: string;
  status: 'pending' | 'answered';
  parentAnswer?: string;
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string>('お子さま');

  // アクセス制御チェック
  useEffect(() => {
    if (!requireAuth('child')) {
      router.push('/login');
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  // URLパラメータからchildIdを取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlChildId = urlParams.get('childId');
      setChildId(urlChildId);
    }
  }, []);

  // 子アカウント名を取得
  useEffect(() => {
    if (!childId) return;
    const fetchChildProfile = async () => {
      try {
        const response = await fetch(`/api/child/profile?childId=${childId}`);
        const result = await response.json();

        if (result.success && result.profile) {
          setChildName(result.profile.displayName || 'お子さま');
        }
      } catch (error) {
        console.error('子アカウント情報取得エラー:', error);
      }
    };

    fetchChildProfile();
  }, [childId]);

  useEffect(() => {
    if (!isAuthorized || !childId) return;
    fetchAllQuestions();
  }, [isAuthorized, childId]);

  const fetchAllQuestions = async () => {
    try {
      if (!childId) {
        console.log('childIdがありません');
        return;
      }

      // 子アカウントのセッション情報を取得
      const parentSession = JSON.parse(localStorage.getItem('authSession') || '{}');
      const childSession = {
        userId: childId,
        userType: 'child',
        parentId: parentSession.userId,
        masterId: parentSession.masterId || 'master-1',
        organizationId: parentSession.organizationId || 'org-1'
      };

      // 子アカウント用APIで記事を取得
      const articlesResponse = await fetch(`/api/articles/child/${childId}`, {
        headers: {
          'X-Auth-Session': JSON.stringify(childSession)
        }
      });
      const articlesResult = await articlesResponse.json();

      if (articlesResult.success && articlesResult.articles) {
        const allQuestions: Question[] = [];

        // 各記事の質問を取得
        for (const article of articlesResult.articles) {
          const response = await fetch(`/api/articles/${article.id}/question`);
          const result = await response.json();

          if (result.success && result.questions.length > 0) {
            const childQuestions = result.questions
              .filter((q: { userId: string }) => q.userId === childId)
              .map((q: {
                id: string;
                articleId: string;
                question: string;
                userId: string;
                createdAt: string;
                status: string;
                parentAnswer?: string;
                articleTitle?: string;
              }) => ({
                ...q,
                childId: q.userId,
                articleTitle: q.articleTitle || article.convertedTitle || article.originalTitle
              }));

            allQuestions.push(...childQuestions);
          }
        }

        // 作成日時順でソート（新しい順）
        allQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setQuestions(allQuestions);
      }
    } catch (error) {
      console.error('質問取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredQuestions = () => {
    switch (filter) {
      case 'pending':
        return questions.filter(q => q.status === 'pending');
      case 'answered':
        return questions.filter(q => q.status === 'answered');
      default:
        return questions;
    }
  };

  const pendingCount = questions.filter(q => q.status === 'pending').length;
  const answeredCount = questions.filter(q => q.status === 'answered').length;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-200 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-lg">
          <div className="text-6xl mb-4 animate-spin">🔄</div>
          <h2 className="text-2xl font-bold text-gray-800">
            しつもん を よみこみちゅう...
          </h2>
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
            <Link
              href={childId ? `/kids?childId=${childId}` : '/kids'}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span className="text-2xl">←</span>
              <span className="font-bold">もどる</span>
            </Link>
            <div className="flex items-center space-x-2">
              <span className="text-lg">🧒</span>
              <span className="text-sm font-medium text-gray-600">{childName} さん</span>
              <span className="text-2xl">❓</span>
              <h1 className="text-xl font-bold text-gray-800">わたしの しつもん</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 統計カード */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">💬</div>
            <div className="text-2xl font-bold text-gray-800">{questions.length}</div>
            <div className="text-sm text-gray-600">ぜんぶ</div>
          </div>
          <div className="bg-yellow-100/90 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-yellow-700">まってる</div>
          </div>
          <div className="bg-green-100/90 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-600">{answeredCount}</div>
            <div className="text-sm text-green-700">おへんじ きた！</div>
          </div>
        </div>

        {/* フィルターボタン */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ぜんぶ
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              まってる ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('answered')}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                filter === 'answered'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              おへんじ きた！ ({answeredCount})
            </button>
          </div>
        </div>

        {/* 質問リスト */}
        {getFilteredQuestions().length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">
              {filter === 'all' ? '💭' : filter === 'pending' ? '⏳' : '📭'}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {filter === 'all' 
                ? 'まだ しつもんが ないよ'
                : filter === 'pending'
                ? 'まってる しつもんが ないよ'
                : 'おへんじを もらった しつもんが ないよ'
              }
            </h2>
            <p className="text-gray-600 mb-6">
              ニュースを よんで、しつもんしてみよう！
            </p>
            <Link
              href={childId ? `/kids?childId=${childId}` : '/kids'}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold transition-colors"
            >
              ニュースを みる
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredQuestions().map((question) => (
              <div key={question.id} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                {/* 記事タイトル */}
                <Link
                  href={childId ? `/kids/article/${question.articleId}?childId=${childId}` : `/kids/article/${question.articleId}`}
                  className="block mb-4 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <div className="text-sm text-blue-600 font-medium mb-1">きじ:</div>
                  <div className="text-blue-800 font-medium">{question.articleTitle}</div>
                </Link>

                {/* 質問と回答のスレッド */}
                <div className="space-y-4">
                  {/* 子供の質問 */}
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">👧</div>
                    <div className="flex-1">
                      <div className="bg-purple-100 rounded-2xl p-4">
                        <div className="text-sm text-purple-600 font-medium mb-1">あなたの しつもん:</div>
                        <div className="text-gray-800 text-lg">{question.question}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(question.createdAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  </div>

                  {/* 親の回答または待機状態 */}
                  {question.status === 'answered' && question.parentAnswer ? (
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">👩</div>
                      <div className="flex-1">
                        <div className="bg-green-100 rounded-2xl p-4">
                          <div className="text-sm text-green-600 font-medium mb-1">おとうさん・おかあさんから:</div>
                          <div className="text-gray-800 text-lg">{question.parentAnswer}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 text-gray-500 ml-12">
                      <div className="text-2xl animate-pulse">⏳</div>
                      <div className="text-lg">おとうさん・おかあさんが かんがえてくれているよ...</div>
                    </div>
                  )}
                </div>

                {/* ステータスバッジ */}
                <div className="mt-4 flex justify-end">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    question.status === 'answered'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {question.status === 'answered' ? 'おへんじ きた！' : 'まってるよ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ボトムナビゲーション */}
        <div className="mt-8 text-center">
          <Link
            href={childId ? `/kids?childId=${childId}` : '/kids'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            ニュース いちらんに もどる
          </Link>
        </div>
      </div>
    </div>
  );
}