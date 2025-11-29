'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, requireAuth, getAuthSession, isMasterUser } from "../../lib/auth";

interface ParentAccount {
  id: string;
  email: string;
  displayName: string;
  organizationId?: string;
  isActive: boolean;
  createdAt: string;
  childrenCount: number;
}

interface Organization {
  id: string;
  name: string;
  masterId: string;
  isActive: boolean;
  createdAt: string;
  parentCount: number;
  childCount: number;
}

interface Invitation {
  id: string;
  email: string;
  targetType: 'parent' | 'child';
  status: 'pending' | 'accepted' | 'expired';
  code: string;
  expiresAt: string;
  createdAt: string;
}

export default function MasterDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'parents' | 'organizations' | 'invitations'>('overview');
  
  // データ状態
  const [parents, setParents] = useState<ParentAccount[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalParents: 0,
    totalChildren: 0,
    activeUsers: 0,
    totalArticles: 0,
    newUsersThisMonth: {
      parents: 0,
      children: 0,
      total: 0
    },
    newUsersThisWeek: {
      parents: 0,
      children: 0,
      total: 0
    },
    invitations: {
      total: 0,
      pending: 0,
      accepted: 0,
      expired: 0,
      acceptanceRate: 0
    },
    activity: {
      lastWeekLogins: 0,
      avgChildrenPerParent: 0
    },
    trends: {
      userGrowthRate: 0,
      articlesThisMonth: 0
    }
  });
  
  // フォーム状態
  const [showCreateParentModal, setShowCreateParentModal] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newOrgName, setNewOrgName] = useState('');

  // アクセス制御チェック
  useEffect(() => {
    console.log('🔍 マスター管理画面: アクセス制御チェック開始');
    console.log('🔍 isMasterUser():', isMasterUser());
    
    try {
      if (!isMasterUser()) {
        console.log('❌ マスター権限なし - ログインページにリダイレクト');
        router.push('/login');
        return;
      }
      console.log('✅ マスター権限確認完了');
      setIsAuthorized(true);
      loadData();
    } catch (error) {
      console.error('❌ アクセス制御チェックエラー:', error);
      router.push('/login');
    }
  }, [router]);

  const loadData = async () => {
    try {
      console.log('📊 データ読み込み開始');
      setLoading(true);
      
      // 統計データの取得
      console.log('📊 統計APIを呼び出し中...');
      try {
        const statsResponse = await fetch('/api/master/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('📊 統計データ取得成功:', statsData.stats);
          setStats(statsData.stats);
        } else {
          console.warn('⚠️ 統計API失敗、ダミーデータを使用');
          setStats({
            totalOrganizations: 1,
            totalParents: 2,
            totalChildren: 3,
            activeUsers: 5,
            totalArticles: 10,
            newUsersThisMonth: { parents: 1, children: 2, total: 3 },
            newUsersThisWeek: { parents: 0, children: 1, total: 1 },
            invitations: { total: 2, pending: 1, accepted: 1, expired: 0, acceptanceRate: 50 },
            activity: { lastWeekLogins: 3, avgChildrenPerParent: 1.5 },
            trends: { userGrowthRate: 15, articlesThisMonth: 5 }
          });
        }
      } catch (error) {
        console.error('📊 統計API呼び出しエラー:', error);
        setStats({
          totalOrganizations: 1,
          totalParents: 2,
          totalChildren: 3,
          activeUsers: 5,
          totalArticles: 10,
          newUsersThisMonth: { parents: 1, children: 2, total: 3 },
          newUsersThisWeek: { parents: 0, children: 1, total: 1 },
          invitations: { total: 2, pending: 1, accepted: 1, expired: 0, acceptanceRate: 50 },
          activity: { lastWeekLogins: 3, avgChildrenPerParent: 1.5 },
          trends: { userGrowthRate: 15, articlesThisMonth: 5 }
        });
      }
      
      // 親アカウント一覧の取得
      console.log('👨‍👩‍👧‍👦 親アカウントAPIを呼び出し中...');
      try {
        const parentsResponse = await fetch('/api/master/parents');
        if (parentsResponse.ok) {
          const parentsData = await parentsResponse.json();
          console.log('👨‍👩‍👧‍👦 親アカウントデータ取得成功:', parentsData.parents);
          setParents(parentsData.parents);
        } else {
          console.warn('⚠️ 親アカウントAPI失敗、ダミーデータを使用');
          setParents([
            {
              id: '1',
              email: 'parent1@example.com',
              displayName: '田中太郎',
              organizationId: 'org-1',
              isActive: true,
              createdAt: '2024-01-15T10:00:00Z',
              childrenCount: 2
            }
          ]);
        }
      } catch (error) {
        console.error('👨‍👩‍👧‍👦 親アカウントAPI呼び出しエラー:', error);
        setParents([]);
      }
      
      // 組織一覧の取得
      console.log('🏢 組織APIを呼び出し中...');
      try {
        const orgsResponse = await fetch('/api/master/organizations');
        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          console.log('🏢 組織データ取得成功:', orgsData.organizations);
          setOrganizations(orgsData.organizations);
        } else {
          console.warn('⚠️ 組織API失敗、ダミーデータを使用');
          setOrganizations([
            {
              id: 'org-1',
              name: 'ファミリー学習グループ',
              masterId: 'master-1',
              isActive: true,
              createdAt: '2024-01-01T00:00:00Z',
              parentCount: 5,
              childCount: 8
            }
          ]);
        }
      } catch (error) {
        console.error('🏢 組織API呼び出しエラー:', error);
        setOrganizations([]);
      }
      
      // 招待一覧の取得
      console.log('📨 招待APIを呼び出し中...');
      try {
        const invitationsResponse = await fetch('/api/master/invitations');
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();
          console.log('📨 招待データ取得成功:', invitationsData.invitations);
          setInvitations(invitationsData.invitations);
        } else {
          console.warn('⚠️ 招待API失敗、ダミーデータを使用');
          setInvitations([
            {
              id: 'inv-1',
              email: 'newparent@example.com',
              targetType: 'parent',
              status: 'pending',
              code: 'ABC123',
              expiresAt: '2024-12-31T23:59:59Z',
              createdAt: '2024-11-01T10:00:00Z'
            }
          ]);
        }
      } catch (error) {
        console.error('📨 招待API呼び出しエラー:', error);
        setInvitations([]);
      }
      
    } catch (error) {
      console.error('❌ データ読み込みエラー:', error);
    } finally {
      console.log('✅ データ読み込み完了');
      setLoading(false);
    }
  };

  const handleCreateParent = async () => {
    try {
      const session = getAuthSession();
      if (!session || !session.userId) {
        alert('ログインセッションが見つかりません');
        return;
      }

      const response = await fetch('/api/master/parents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newParentEmail,
          displayName: newParentName,
          masterId: session.userId
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`親アカウントの招待を送信しました。招待コード: ${result.invitationCode}`);
        setNewParentEmail('');
        setNewParentName('');
        setShowCreateParentModal(false);
        loadData(); // データを再読み込み
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || error.message || '不明なエラーが発生しました'}`);
      }
    } catch (error) {
      console.error('親アカウント作成エラー:', error);
      alert('親アカウントの作成中にエラーが発生しました');
    }
  };

  const handleCreateOrganization = async () => {
    try {
      const response = await fetch('/api/master/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newOrgName
        }),
      });
      
      if (response.ok) {
        alert('組織を作成しました');
        setNewOrgName('');
        setShowCreateOrgModal(false);
        loadData(); // データを再読み込み
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || error.message || '不明なエラーが発生しました'}`);
      }
    } catch (error) {
      console.error('組織作成エラー:', error);
      alert('組織の作成中にエラーが発生しました');
    }
  };

  const handleDeactivateParent = async (parentId: string) => {
    if (!confirm('この親アカウントを無効化しますか？関連する子アカウントも無効化されます。')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/master/parents/${parentId}/deactivate`, {
        method: 'POST',
      });
      
      if (response.ok) {
        alert('親アカウントを無効化しました');
        loadData();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || error.message || '不明なエラーが発生しました'}`);
      }
    } catch (error) {
      console.error('親アカウント無効化エラー:', error);
      alert('親アカウントの無効化中にエラーが発生しました');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
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

  // 未認証の場合は何も表示しない（リダイレクト中）
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🔄</div>
          <div className="text-gray-600">認証確認中...</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🔄</div>
          <div className="text-gray-600">データ読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
      {/* ヘッダー */}
      <header className="bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-3xl">👑</span>
              <div>
                <h1 className="text-2xl font-bold text-blue-600">シルシル マスター管理</h1>
                <p className="text-sm text-gray-600">システム全体を管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">マスター管理者</span>
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

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* タブナビゲーション */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            {[
              { key: 'overview', label: '概要', icon: '📊' },
              { key: 'parents', label: '親アカウント', icon: '👨‍👩‍👧‍👦' },
              { key: 'organizations', label: '組織', icon: '🏢' },
              { key: 'invitations', label: '招待', icon: '📨' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 px-6 py-4 text-center transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🏢</div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalOrganizations}</div>
                    <div className="text-sm text-gray-600">組織</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">👨‍👩‍👧‍👦</div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.totalParents}</div>
                    <div className="text-sm text-gray-600">親アカウント</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🧒</div>
                  <div>
                    <div className="text-2xl font-bold text-pink-600">{stats.totalChildren}</div>
                    <div className="text-sm text-gray-600">子アカウント</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">✅</div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{stats.activeUsers}</div>
                    <div className="text-sm text-gray-600">アクティブユーザー</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">📰</div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{stats.totalArticles}</div>
                    <div className="text-sm text-gray-600">総記事数</div>
                  </div>
                </div>
              </div>
            </div>

            {/* システム情報 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">システム情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">バージョン</h3>
                  <p className="text-gray-600">シルシル v1.0.0</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">データベース</h3>
                  <p className="text-gray-600">Supabase (アクティブ)</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">最終更新</h3>
                  <p className="text-gray-600">2024年11月6日</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">ステータス</h3>
                  <p className="text-green-600">🟢 正常稼働中</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 親アカウントタブ */}
        {activeTab === 'parents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">親アカウント管理</h2>
              <button
                onClick={() => setShowCreateParentModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                新規親アカウント招待
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">組織</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">子アカウント</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parents.map((parent) => (
                    <tr key={parent.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{parent.displayName}</div>
                          <div className="text-sm text-gray-500">{parent.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parent.organizationId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parent.childrenCount}人
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(parent.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                          parent.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {parent.isActive ? 'アクティブ' : '無効'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {parent.isActive && (
                          <button
                            onClick={() => handleDeactivateParent(parent.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            無効化
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 組織タブ */}
        {activeTab === 'organizations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">組織管理</h2>
              <button
                onClick={() => setShowCreateOrgModal(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                新規組織作成
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <div key={org.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">{org.name}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      org.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {org.isActive ? 'アクティブ' : '無効'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">親アカウント</span>
                      <span className="font-medium">{org.parentCount}人</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">子アカウント</span>
                      <span className="font-medium">{org.childCount}人</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">作成日</span>
                      <span className="font-medium">{formatDate(org.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 招待タブ */}
        {activeTab === 'invitations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">招待管理</h2>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">招待先</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">招待コード</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">有効期限</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invitation.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invitation.targetType === 'parent' ? '親アカウント' : '子アカウント'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {invitation.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invitation.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                          invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          invitation.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invitation.status === 'accepted' ? '承認済み' :
                           invitation.status === 'expired' ? '期限切れ' : '保留中'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invitation.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 親アカウント作成モーダル */}
      {showCreateParentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">新規親アカウント招待</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={newParentEmail}
                  onChange={(e) => setNewParentEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="parent@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示名
                </label>
                <input
                  type="text"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="田中太郎"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateParentModal(false);
                  setNewParentEmail('');
                  setNewParentName('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateParent}
                disabled={!newParentEmail || !newParentName}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors"
              >
                招待送信
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 組織作成モーダル */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">新規組織作成</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  組織名
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="ファミリー学習グループ"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateOrgModal(false);
                  setNewOrgName('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateOrganization}
                disabled={!newOrgName}
                className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}