'use client'

import { useState } from 'react';
import { getUserId } from '@/lib/auth';

interface SaveAccountBannerProps {
  onSaved?: () => void;
}

export default function SaveAccountBanner({ onSaved }: SaveAccountBannerProps) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // バリデーション
    if (!email || !password || !confirmPassword) {
      setError('全ての項目を入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で設定してください');
      return;
    }

    setIsLoading(true);

    try {
      const userId = getUserId();

      if (!userId) {
        setError('ユーザー情報が見つかりません');
        return;
      }

      const response = await fetch('/api/auth/setup-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          password,
          displayName
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ アカウント保存成功');
        setShowModal(false);
        onSaved?.();
        alert('アカウントが保存されました！次回からメールアドレスとパスワードでログインできます。');
      } else {
        setError(result.error || 'アカウント保存に失敗しました');
      }
    } catch (error) {
      console.error('アカウント保存エラー:', error);
      setError('アカウント保存中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <>
      {/* バナー */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-lg shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">💡 このアカウントを保存しませんか？</h3>
            <p className="text-sm opacity-90">
              メールアドレスとパスワードを設定すると、次回から簡単にログインできます
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
              設定する
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-white hover:text-blue-100 px-3 py-2 rounded-lg transition-colors"
            >
              後で
            </button>
          </div>
        </div>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              アカウントを保存
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              メールアドレスとパスワードを設定して、次回から簡単にログイン
            </p>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                  表示名（オプション）
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="現在の表示名を変更する場合"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード（確認） <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 py-3 px-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                    isLoading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg'
                  }`}
                >
                  {isLoading ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
