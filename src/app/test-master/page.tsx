'use client'

export default function TestMaster() {
  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">👑 テストマスターページ</h1>
        <p className="text-gray-600">このページが表示されれば、ルーティングは正常です。</p>
        <div className="mt-4">
          <button 
            onClick={() => console.log('ボタンクリック')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            テストボタン
          </button>
        </div>
      </div>
    </div>
  );
}