'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthSession, clearAuthSession } from "../../lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitationCode.trim()) {
      setError('招待コードを入力してください');
      return;
    }

    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // ユーザーが入力した招待コードを使用してアカウント作成（仮アカウント）
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: invitationCode.trim(),
          displayName: displayName.trim()
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

        console.log('🎉 アカウント作成成功:', result.user);
        router.push('/parent');
      } else {
        setError(result.error || 'アカウント作成に失敗しました');
      }
    } catch (error) {
      console.error('アカウント作成エラー:', error);
      setError('アカウント作成中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 flex items-center justify-center">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center shadow-2xl max-w-md w-full mx-4">
        <div className="text-6xl mb-6">🚀</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          シルシルへようこそ
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          親アカウントを作成して、お子さまとニュースを楽しく共有しましょう
        </p>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="text-left space-y-4">
            <div>
              <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700 mb-2">
                招待コード <span className="text-red-500">*</span>
              </label>
              <input
                id="invitationCode"
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toLowerCase())}
                placeholder="招待コードを入力"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-lg tracking-wider font-mono"
                autoFocus
                disabled={isLoading}
                maxLength={20}
              />
              <p className="mt-1 text-xs text-gray-500">
                招待コードをお持ちでない方は、公式サイトまたはSNSでご確認ください
              </p>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                表示名 <span className="text-red-500">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: 田中太郎"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
                maxLength={50}
              />
              <p className="mt-1 text-xs text-gray-500">
                メールアドレス・パスワードは後で設定できます
              </p>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 py-3 px-4 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !invitationCode.trim() || !displayName.trim()}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
              isLoading || !invitationCode.trim() || !displayName.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg transform hover:scale-105'
            }`}
          >
            {isLoading ? 'アカウント作成中...' : 'アカウントを作成'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            既にアカウントをお持ちですか？
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            disabled={isLoading}
          >
            ログインページへ
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-400">
          まずは気軽に体験してみましょう！<br />
          後でメールアドレスとパスワードを設定すると、次回から簡単にログインできます
        </div>
      </div>
    </div>
  );
}
