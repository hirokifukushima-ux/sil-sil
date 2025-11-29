'use client'

import { useState } from 'react';

export interface ConvertedArticle {
  title: string;
  content: string;
  originalTitle: string;
  summary: string;
  convertedAt: string;
}

interface ConvertedArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  convertedArticle: ConvertedArticle;
  originalUrl: string;
}

// マークダウン風のテキストを分析してJSX要素に変換する関数
function parseContentToJSX(content: string) {
  return content.split('\n').map((line, index) => {
    // 引用コメントの処理 (> text → 引用スタイル)
    if (line.startsWith('> ')) {
      const quoteText = line.substring(2);
      return (
        <div key={index} className="border-l-4 border-green-400 pl-4 py-2 my-3 bg-green-50 text-gray-700 italic">
          {quoteText}
        </div>
      );
    }
    
    // 太字の処理 (**text** → <strong>text</strong>)
    const processedLine = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    if (processedLine.includes('<strong>')) {
      // HTMLが含まれている場合はdangerouslySetInnerHTMLを使用
      return (
        <div 
          key={index} 
          dangerouslySetInnerHTML={{ __html: processedLine }}
          className={processedLine.includes('<strong>') ? 'font-semibold text-gray-800 mb-2' : ''}
        />
      );
    } else if (line.trim() === '') {
      // 空行
      return <br key={index} />;
    } else {
      // 通常のテキスト
      return <div key={index} className="mb-2">{line}</div>;
    }
  });
}

export default function ConvertedArticleModal({ 
  isOpen, 
  onClose, 
  convertedArticle,
  originalUrl
}: ConvertedArticleModalProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">👶</span>
            子供向けニュース
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 変換成功通知 */}
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
              <span className="text-xl mr-2">✅</span>
              <div>
                <strong>変換完了！</strong>
                <div className="text-sm">この記事を子供にも分かりやすく変換しました</div>
              </div>
            </div>

            {/* タイトル */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {convertedArticle.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                <span>🕒 {new Date(convertedArticle.convertedAt).toLocaleString('ja-JP')}</span>
                <span>📝 子供向けに変換済み</span>
              </div>
              
              {/* 元のタイトル表示切り替え */}
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showOriginal ? '元のタイトルを隠す' : '元のタイトルを表示'}
              </button>
              
              {showOriginal && (
                <div className="mt-2 p-3 bg-gray-100 rounded text-sm">
                  <strong>元のタイトル:</strong> {convertedArticle.originalTitle}
                </div>
              )}
            </div>
            
            {/* 要約 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="text-lg mr-2">📝</span>
                要約
              </h3>
              <p className="text-gray-700">{convertedArticle.summary}</p>
            </div>
            
            {/* 本文 */}
            <div className="prose max-w-none">
              <div className="text-gray-700 leading-relaxed text-lg">
                {parseContentToJSX(convertedArticle.content)}
              </div>
            </div>
            
            {/* 元記事リンク */}
            <div className="border-t border-gray-200 pt-4">
              <a 
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 underline text-sm flex items-center"
              >
                <span className="mr-1">🔗</span>
                元の記事を読む
              </a>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>💡 この記事は AI によって子供向けに変換されました</p>
              <p className="text-xs mt-1">より分かりやすい表現で、大切なポイントをまとめています</p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors font-medium"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}