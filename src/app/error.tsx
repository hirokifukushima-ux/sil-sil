'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
        <p className="text-gray-600 mb-6">申し訳ございませんが、エラーが発生しました。</p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            再試行
          </button>
          <a 
            href="/" 
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-block"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}