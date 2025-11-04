export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-6">ページが見つかりません</p>
        <a 
          href="/" 
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
}