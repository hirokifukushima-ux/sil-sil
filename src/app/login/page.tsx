'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [selectedUserType, setSelectedUserType] = useState<'child' | 'parent' | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // パスワード設定
  const PASSWORDS = {
    parent: 'parent123',
    child: 'kids123'
  };

  const handleUserTypeSelect = (userType: 'child' | 'parent') => {
    setSelectedUserType(userType);
    setPassword('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserType) return;

    setIsLoading(true);
    setError('');

    // パスワード確認
    if (password !== PASSWORDS[selectedUserType]) {
      setError('パスワードが間違っています');
      setIsLoading(false);
      return;
    }

    // 認証成功
    localStorage.setItem('userType', selectedUserType);
    localStorage.setItem('authTime', Date.now().toString());
    
    // 対応するページにリダイレクト
    if (selectedUserType === 'child') {
      router.push('/kids');
    } else {
      router.push('/parent');
    }
    
    setIsLoading(false);
  };

  const goBack = () => {
    setSelectedUserType(null);
    setPassword('');
    setError('');
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

        {/* ユーザータイプ未選択時 */}
        {!selectedUserType ? (
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
            </div>
            
            <div className="mt-8 text-sm text-gray-500">
              家族でニュースを楽しく学びましょう
            </div>
          </>
        ) : (
          /* パスワード入力画面 */
          <>
            <div className="mb-6">
              <div className="text-4xl mb-4">
                {selectedUserType === 'child' ? '👧' : '👩'}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedUserType === 'child' ? 'こども' : 'おとうさん・おかあさん'}
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
              ) : (
                <div>
                  ヒント: 親用パスワードは<br/>
                  <code className="bg-gray-100 px-2 py-1 rounded">parent123</code>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}