'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearUserType, requireAuth, isParentUser } from "../../../lib/auth";

interface ChildAccount {
  id: string;
  displayName: string;
  childAge: number; // 実際は理解度レベル（1-6）
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
  articlesRead?: number;
}

// 理解度レベルの定義
const COMPREHENSION_LEVELS = {
  1: '超簡単・ひらがな多め',
  2: '小学校低学年レベル',
  3: '小学校中学年レベル',
  4: '小学校高学年レベル',
  5: '中学生レベル',
  6: '高校生レベル'
} as const;

interface Invitation {
  id: string;
  email: string;
  code: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export default function ChildrenManagement() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // データ状態
  const [children, setChildren] = useState<ChildAccount[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // フォーム状態
  const [showCreateChildModal, setShowCreateChildModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildEmail, setNewChildEmail] = useState('');
  const [createMethod, setCreateMethod] = useState<'direct' | 'email'>('direct');

  // 編集用状態
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  
  // アクセス制御チェック
  useEffect(() => {
    if (!isParentUser()) {
      router.push('/login');
      return;
    }
    setIsAuthorized(true);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 子アカウント一覧の取得
      const session = JSON.parse(localStorage.getItem('authSession') || '{}');
      const childrenResponse = await fetch('/api/parent/children', {
        headers: {
          'X-Auth-Session': JSON.stringify(session)
        }
      });
      if (childrenResponse.ok) {
        const childrenData = await childrenResponse.json();
        setChildren(childrenData.children);
      } else {
        console.error('子アカウント取得エラー:', childrenResponse.status);
        setChildren([]);
      }
      
      // 招待一覧の取得
      const invitationsResponse = await fetch(`/api/parent/invitations?parentId=${session.userId}`, {
        headers: {
          'X-Auth-Session': JSON.stringify(session)
        }
      });
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData.invitations);
      } else {
        console.error('招待一覧取得エラー:', invitationsResponse.status);
        setInvitations([]);
      }
      
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChild = async () => {
    try {
      const payload: any = {
        displayName: newChildName,
        childAge: parseInt(newChildAge)
      };
      
      if (createMethod === 'email' && newChildEmail) {
        payload.email = newChildEmail;
      }
      
      const session = JSON.parse(localStorage.getItem('authSession') || '{}');
      const response = await fetch('/api/parent/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Session': JSON.stringify(session)
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (createMethod === 'email') {
          alert(`子アカウントの招待を送信しました。\\n招待コード: ${result.invitationCode}`);
        } else {
          alert(`子アカウントを作成しました。\\nアクティベーションコード: ${result.activationCode}\\n\\nこのコードを子どもに教えて、初回ログイン時に使用してもらってください。`);
        }
        setNewChildName('');
        setNewChildAge('');
        setNewChildEmail('');
        setShowCreateChildModal(false);
        loadData(); // データを再読み込み
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('子アカウント作成エラー:', error);
      alert('子アカウントの作成中にエラーが発生しました');
    }
  };

  const handleDeactivateChild = async (childId: string, childName: string) => {
    if (!confirm(`${childName}のアカウントを無効化しますか？`)) {
      return;
    }

    try {
      const session = JSON.parse(localStorage.getItem('authSession') || '{}');
      const response = await fetch(`/api/parent/children/${childId}/deactivate`, {
        method: 'POST',
        headers: {
          'X-Auth-Session': JSON.stringify(session)
        }
      });

      if (response.ok) {
        alert('子アカウントを無効化しました');
        loadData();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.message}`);
      }
    } catch (error) {
      console.error('子アカウント無効化エラー:', error);
      alert('子アカウントの無効化中にエラーが発生しました');
    }
  };

  const handleEditChild = (child: ChildAccount) => {
    setEditingChild(child);
    setEditName(child.displayName);
    setEditAge(child.childAge.toString());
    setShowEditModal(true);
  };

  const handleUpdateChild = async () => {
    if (!editingChild) return;

    if (!editName.trim()) {
      alert('名前を入力してください');
      return;
    }

    const level = parseInt(editAge);
    if (isNaN(level) || level < 1 || level > 6) {
      alert('理解度レベルは1から6までで選択してください');
      return;
    }

    try {
      const session = JSON.parse(localStorage.getItem('authSession') || '{}');
      const response = await fetch(`/api/parent/children/${editingChild.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Session': JSON.stringify(session)
        },
        body: JSON.stringify({
          displayName: editName,
          childAge: level
        })
      });

      if (response.ok) {
        alert('子アカウントを更新しました');
        setShowEditModal(false);
        setEditingChild(null);
        setEditName('');
        setEditAge('');
        loadData();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      console.error('子アカウント更新エラー:', error);
      alert('子アカウントの更新中にエラーが発生しました');
    }
  };

  const handleLogout = () => {
    clearUserType();
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return formatDate(dateString);
    }
  };

  // 未認証の場合は何も表示しない（リダイレクト中）
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🔄</div>
          <div className="text-gray-600">認証確認中...</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🔄</div>
          <div className="text-gray-600">データ読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100">
      {/* ヘッダー */}
      <header className="bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/parent" className="flex items-center space-x-2 text-green-600 hover:text-green-800 transition-colors">
                <span className="text-2xl">←</span>
                <span className="font-bold">親ダッシュボード</span>
              </Link>
              <div className="flex items-center space-x-2">
                <span className="text-3xl">👨‍👩‍👧‍👦</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">子アカウント管理</h1>
                  <p className="text-sm text-gray-600">お子様のアカウントを管理</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">親アカウント</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">👶</div>
              <div>
                <div className="text-2xl font-bold text-green-600">{children.length}</div>
                <div className="text-sm text-gray-600">子アカウント</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">✅</div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{children.filter(c => c.isActive).length}</div>
                <div className="text-sm text-gray-600">アクティブ</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📨</div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{invitations.filter(i => i.status === 'pending').length}</div>
                <div className="text-sm text-gray-600">招待中</div>
              </div>
            </div>
          </div>
        </div>

        {/* 子アカウント一覧 */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">子アカウント一覧</h2>
            <button
              onClick={() => setShowCreateChildModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              新しい子アカウントを追加
            </button>
          </div>
          
          {children.length > 0 ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {children.map((child) => (
                  <div key={child.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl">🧒</div>
                        <div>
                          <h3 className="font-bold text-gray-800">{child.displayName}</h3>
                          <p className="text-sm text-gray-600">
                            {COMPREHENSION_LEVELS[child.childAge as keyof typeof COMPREHENSION_LEVELS] || `レベル${child.childAge}`}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        child.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {child.isActive ? 'アクティブ' : '無効'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">読んだ記事</span>
                        <span className="font-medium">{child.articlesRead || 0}件</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">最終ログイン</span>
                        <span className="font-medium">{formatRelativeDate(child.lastLoginAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">作成日</span>
                        <span className="font-medium">{formatDate(child.createdAt)}</span>
                      </div>
                    </div>
                    
                    {/* 子アカウント直接URL */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-600">子画面直接URL</label>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/kids?childId=${child.id}`;
                            navigator.clipboard.writeText(url);
                            alert('URLをクリップボードにコピーしました！');
                          }}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                        >
                          📋 URLコピー
                        </button>
                      </div>
                      <div className="text-xs font-mono bg-white border rounded p-2 break-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/kids?childId=${child.id}` : `/kids?childId=${child.id}`}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        💡 このURLを直接ブラウザで開くと子画面にアクセスできます
                      </p>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Link
                        href={`/kids?from=parent&childId=${child.id}`}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-center text-sm transition-colors"
                      >
                        🔗 子画面で見る
                      </Link>
                      <button
                        onClick={() => handleEditChild(child)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-3 rounded text-sm transition-colors"
                      >
                        ✏️ 編集
                      </button>
                      {child.isActive && (
                        <button
                          onClick={() => handleDeactivateChild(child.id, child.displayName)}
                          className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded text-sm transition-colors"
                        >
                          無効化
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👶</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">子アカウントがありません</h3>
              <p className="text-gray-600 mb-6">最初の子アカウントを作成しましょう</p>
              <button
                onClick={() => setShowCreateChildModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                子アカウントを作成
              </button>
            </div>
          )}
        </div>

        {/* 招待一覧 */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">招待状況</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">📨</div>
                      <div>
                        <div className="font-medium text-gray-800">{invitation.email}</div>
                        <div className="text-sm text-gray-600">
                          招待コード: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{invitation.code}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        invitation.status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invitation.status === 'accepted' ? '承認済み' :
                         invitation.status === 'expired' ? '期限切れ' : '待機中'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        期限: {formatDate(invitation.expiresAt)}
                      </div>
                      
                      {invitation.status === 'accepted' && (
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              // 承認済み招待の場合、対応する子アカウントのURLを生成
                              const childUrl = `${window.location.origin}/kids?childId=${invitation.code}`;
                              navigator.clipboard.writeText(childUrl);
                              alert('子画面URLをクリップボードにコピーしました！');
                            }}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                          >
                            📋 子画面URL
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 子アカウント作成モーダル */}
      {showCreateChildModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-90vh overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">新しい子アカウント</h3>
            
            {/* 作成方法選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">作成方法</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="direct"
                    checked={createMethod === 'direct'}
                    onChange={(e) => setCreateMethod(e.target.value as 'direct')}
                    className="mr-2"
                  />
                  <span>直接作成（推奨）</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="email"
                    checked={createMethod === 'email'}
                    onChange={(e) => setCreateMethod(e.target.value as 'email')}
                    className="mr-2"
                  />
                  <span>メール招待</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  お子様の名前
                </label>
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="太郎"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  理解度レベル
                </label>
                <select
                  value={newChildAge}
                  onChange={(e) => setNewChildAge(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">レベルを選択</option>
                  {(Object.keys(COMPREHENSION_LEVELS) as Array<keyof typeof COMPREHENSION_LEVELS>).map(level => (
                    <option key={level} value={level}>
                      {level}. {COMPREHENSION_LEVELS[level]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 子どもの実年齢ではなく、ニュースの理解度レベルを選択してください
                </p>
              </div>
              
              {createMethod === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス（招待用）
                  </label>
                  <input
                    type="email"
                    value={newChildEmail}
                    onChange={(e) => setNewChildEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="child@example.com"
                  />
                </div>
              )}
            </div>
            
            {createMethod === 'direct' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 直接作成すると、アクティベーションコードが生成されます。お子様に教えて初回ログイン時に使用してもらってください。
                </p>
              </div>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateChildModal(false);
                  setNewChildName('');
                  setNewChildAge('');
                  setNewChildEmail('');
                  setCreateMethod('direct');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateChild}
                disabled={
                  !newChildName || 
                  !newChildAge || 
                  (createMethod === 'email' && !newChildEmail)
                }
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {createMethod === 'email' ? '招待送信' : 'アカウント作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 子アカウント編集モーダル */}
      {showEditModal && editingChild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">子アカウント編集</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="例: たろう"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  理解度レベル <span className="text-red-500">*</span>
                </label>
                <select
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">レベルを選択</option>
                  {(Object.keys(COMPREHENSION_LEVELS) as Array<keyof typeof COMPREHENSION_LEVELS>).map(level => (
                    <option key={level} value={level}>
                      {level}. {COMPREHENSION_LEVELS[level]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">子どもの実年齢ではなく、ニュースの理解度レベルを選択</p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingChild(null);
                  setEditName('');
                  setEditAge('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateChild}
                disabled={!editName || !editAge}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}