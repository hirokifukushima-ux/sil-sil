'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // ルートページにアクセスした場合、ログイン画面にリダイレクト
    router.push('/login');
  }, [router]);

  // リダイレクト中の表示
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-6xl mb-4 animate-spin">🔄</div>
        <h1 className="text-2xl font-bold">シルシル</h1>
        <p className="text-lg opacity-80">親子のコミュニケーションを深めるニュース共有アプリ</p>
        <p className="text-sm opacity-60 mt-2">リダイレクト中...</p>
      </div>
    </div>
  );
}
