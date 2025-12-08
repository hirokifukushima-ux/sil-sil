'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthSession, clearAuthSession } from "../../lib/auth";
import { signInWithEmail } from "@/lib/supabase/auth";
import { getDatabase } from "@/lib/database";

export default function LoginPage() {
  const router = useRouter();
  const [selectedUserType, setSelectedUserType] = useState<'child' | 'parent' | 'master' | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMasterLogin, setShowMasterLogin] = useState(false);
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // パスワード設定
  const PASSWORDS = {
    parent: 'parent123',
    child: 'kids123',
    master: 'master999' // マスター管理者用
  };

  const handleUserTypeSelect = (userType: 'child' | 'parent' | 'master') => {
    setSelectedUserType(userType);
    setPassword('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserType) return;

    setIsLoading(true);
    setError('');

    try {
      // マスターユーザーの場合はAPI経由でログイン
      if (selectedUserType === 'master') {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'master@know-news.com',
            password: password,
            userType: 'master'
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'ログインに失敗しました');
          setIsLoading(false);
          return;
        }

        // 認証成功 - データベースから取得したユーザー情報を使用
        console.log(`🔑 ログイン成功: ${selectedUserType}`, result.user);

        // 古いセッションをクリア
        clearAuthSession();

        setAuthSession({
          userId: result.user.id,
          userType: result.user.userType,
          email: result.user.email,
          displayName: result.user.displayName,
          masterId: result.user.masterId,
          parentId: result.user.parentId,
          organizationId: result.user.organizationId,
        });

        console.log('📱 セッション設定完了');
        console.log('🚀 マスター管理画面へリダイレクト');
        router.push('/master');
      } else {
        // 親・子ユーザーの場合は既存のロジック（パスワード確認のみ）
        if (password !== PASSWORDS[selectedUserType]) {
          setError('パスワードが間違っています');
          setIsLoading(false);
          return;
        }

        // 認証成功 - 一時的なIDを使用
        console.log(`🔑 ログイン成功: ${selectedUserType}`);

        // 古いセッションをクリア
        clearAuthSession();

        setAuthSession({
          userId: `${selectedUserType}-${Date.now()}`,
          userType: selectedUserType,
        });

        console.log('📱 セッション設定完了');

        // 対応するページにリダイレクト
        if (selectedUserType === 'child') {
          console.log('🚀 子ページへリダイレクト');
          router.push('/kids');
        } else if (selectedUserType === 'parent') {
          console.log('🚀 親ページへリダイレクト');
          router.push('/parent');
        }
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      setError('ログイン処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitationCode = async () => {
    if (!invitationCode.trim()) {
      setError('招待コードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 招待コードでログイン（新規作成または再ログイン）
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: invitationCode.trim(),
          // emailはnull（後で設定可能な仮アカウント）
          displayName: 'New Parent'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // 成功 - 古いセッションをクリアしてから親アカウントとしてログイン
        clearAuthSession();

        setAuthSession({
          userId: result.user.id,
          userType: 'parent',
          email: result.user.email,
          displayName: result.user.displayName,
          parentId: result.user.parentId,
          masterId: result.user.masterId,
          organizationId: result.user.organizationId
        });

        if (result.isNewUser) {
          alert('アカウントが正常に作成されました！');
        } else {
          alert('再ログインしました！');
        }
        router.push('/parent');
      } else {
        setError(result.error || '招待コードが無効です');
      }
    } catch (error) {
      console.error('招待コード処理エラー:', error);
      setError('招待コードの処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivationCode = async () => {
    if (!activationCode.trim()) {
      setError('アクティベーションコードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // アクティベーションコードでログイン
      const response = await fetch('/api/auth/activation-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: activationCode.trim()
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // 成功 - 古いセッションをクリアしてから子アカウントとしてログイン
        clearAuthSession();

        setAuthSession({
          userId: result.user.id,
          userType: 'child',
          displayName: result.user.displayName,
          childAge: result.user.childAge,
          parentId: result.user.parentId,
          masterId: result.user.masterId,
          organizationId: result.user.organizationId
        });

        alert(`ようこそ、${result.user.displayName}さん！`);
        router.push('/kids');
      } else {
        setError(result.error || 'アクティベーションコードが無効です');
      }
    } catch (error) {
      console.error('アクティベーションコード処理エラー:', error);
      setError('アクティベーションコードの処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !emailPassword.trim()) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Supabase Authでログイン
      const result = await signInWithEmail(email, emailPassword);

      if (!result.success) {
        setError(result.error || 'ログインに失敗しました');
        setIsLoading(false);
        return;
      }

      // ユーザー情報を取得
      const db = getDatabase();
      const user = await db.getUser(result.userId);

      if (!user) {
        setError('ユーザー情報が見つかりません');
        setIsLoading(false);
        return;
      }

      // セッションを設定
      setAuthSession({
        userId: user.id,
        userType: user.userType,
        email: user.email || result.email,
        displayName: user.displayName,
        parentId: user.parentId,
        masterId: user.masterId,
        organizationId: user.organizationId
      });

      console.log('✅ メール・パスワードログイン成功:', user.displayName);

      // ユーザータイプに応じてリダイレクト
      if (user.userType === 'parent') {
        router.push('/parent');
      } else if (user.userType === 'child') {
        router.push('/kids');
      } else if (user.userType === 'master') {
        router.push('/master');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('メール・パスワードログインエラー:', error);
      setError('ログイン中にエラーが発生しました');
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setSelectedUserType(null);
    setPassword('');
    setError('');
    setShowInvitationForm(false);
    setInvitationCode('');
    setShowActivationForm(false);
    setActivationCode('');
    setShowEmailLogin(false);
    setEmail('');
    setEmailPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 flex items-center justify-center">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center shadow-2xl max-w-md w-full mx-4">
        <div className="text-6xl mb-6">🏠</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          シルシル
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          親子のコミュニケーションを深めるニュース共有アプリ
        </p>

        {/* メール・パスワードログインフォーム */}
        {showEmailLogin ? (
          <>
            <div className="mb-6">
              <div className="text-4xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-800">
                メール・パスワードでログイン
              </h2>
              <p className="text-gray-600 mt-2">
                登録済みのメールアドレスとパスワードを入力してください
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="パスワード"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors"
                  disabled={isLoading}
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={handleEmailLogin}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
                  disabled={isLoading || !email.trim() || !emailPassword.trim()}
                >
                  {isLoading ? '処理中...' : 'ログイン'}
                </button>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                アカウントをお持ちでない方は
                <button
                  onClick={() => router.push('/signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium ml-1"
                >
                  新規登録
                </button>
              </div>
            </div>
          </>
        ) : /* アクティベーションコードフォーム */
        showActivationForm ? (
          <>
            <div className="mb-6">
              <div className="text-4xl mb-4">🔑</div>
              <h2 className="text-2xl font-bold text-gray-800">
                アクティベーションコード
              </h2>
              <p className="text-gray-600 mt-2">
                親から受け取ったアクティベーションコードを入力してください
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  placeholder="53ZT7FFV"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-center text-lg tracking-wider font-mono"
                  autoFocus
                  disabled={isLoading}
                  maxLength={8}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors"
                  disabled={isLoading}
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={handleActivationCode}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
                  disabled={isLoading || !activationCode.trim()}
                >
                  {isLoading ? '処理中...' : '子画面にアクセス'}
                </button>
              </div>
            </div>
          </>
        ) : /* 招待コードフォーム */
        showInvitationForm ? (
          <>
            <div className="mb-6">
              <div className="text-4xl mb-4">📨</div>
              <h2 className="text-2xl font-bold text-gray-800">
                招待コードを入力
              </h2>
              <p className="text-gray-600 mt-2">
                受信した招待コードを入力してください
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  placeholder="MW99YJAD"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-lg tracking-wider font-mono"
                  autoFocus
                  disabled={isLoading}
                  maxLength={8}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors"
                  disabled={isLoading}
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={handleInvitationCode}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
                  disabled={isLoading || !invitationCode.trim()}
                >
                  {isLoading ? '処理中...' : '招待を受ける'}
                </button>
              </div>
            </div>
          </>
        ) : !selectedUserType ? (
          <>
            <p className="text-gray-600 mb-8">
              どちらでログインしますか？
            </p>
            
            <div className="space-y-4">
              {/* 子ども用ログイン */}
              <button
                onClick={() => handleUserTypeSelect('child')}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">👧</span>
                  <span>こども</span>
                </div>
              </button>
              
              {/* 親用ログイン */}
              <button
                onClick={() => handleUserTypeSelect('parent')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">👩</span>
                  <span>おとうさん・おかあさん</span>
                </div>
              </button>
              
              {/* アクティベーションコード入力 */}
              <button
                onClick={() => setShowActivationForm(true)}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">🔑</span>
                  <span>アクティベーションコード</span>
                </div>
              </button>
              
              {/* メール・パスワードログイン */}
              <button
                onClick={() => setShowEmailLogin(true)}
                className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">🔐</span>
                  <span>メール・パスワードでログイン</span>
                </div>
              </button>

              {/* 招待コード入力 */}
              <button
                onClick={() => setShowInvitationForm(true)}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">📨</span>
                  <span>招待コードを使う</span>
                </div>
              </button>
              
              {/* マスター管理者用ログイン（隠し機能） */}
              {showMasterLogin && (
                <button
                  onClick={() => handleUserTypeSelect('master')}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg transform hover:scale-105"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-2xl">👑</span>
                    <span>マスター管理者</span>
                  </div>
                </button>
              )}
            </div>
            
            <div className="mt-8 text-sm text-gray-500">
              家族でニュースを楽しく学びましょう
              <button
                onClick={() => setShowMasterLogin(!showMasterLogin)}
                className="ml-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showMasterLogin ? '管理者ログインを隠す' : '🔧'}
              </button>
            </div>
          </>
        ) : (
          /* パスワード入力画面 */
          <>
            <div className="mb-6">
              <div className="text-4xl mb-4">
                {selectedUserType === 'child' ? '👧' : 
                 selectedUserType === 'parent' ? '👩' : '👑'}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedUserType === 'child' ? 'こども' : 
                 selectedUserType === 'parent' ? 'おとうさん・おかあさん' : 'マスター管理者'}
              </h2>
              <p className="text-gray-600 mt-2">
                パスワードを入力してください
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワード"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  もどる
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all duration-300 ${
                    isLoading || !password
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : selectedUserType === 'child'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                  }`}
                >
                  {isLoading ? '確認中...' : 'ログイン'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-xs text-gray-400">
              {selectedUserType === 'child' ? (
                <div>
                  ヒント: こども用パスワードは<br/>
                  <code className="bg-gray-100 px-2 py-1 rounded">kids123</code>
                </div>
              ) : selectedUserType === 'parent' ? (
                <div>
                  ヒント: 親用パスワードは<br/>
                  <code className="bg-gray-100 px-2 py-1 rounded">parent123</code>
                </div>
              ) : (
                <div>
                  ヒント: マスター管理者パスワードは<br/>
                  <code className="bg-gray-100 px-2 py-1 rounded">master999</code>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}