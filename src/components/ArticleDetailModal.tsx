'use client'

import { useState, useEffect } from 'react';
import ConvertedArticleModal, { ConvertedArticle } from './ConvertedArticleModal';
import { getAuthSession } from '../lib/auth';

export interface ArticleDetail {
  title: string;
  content: string;
  publishedAt: string;
  image?: string;
  summary: string;
  url: string;
  source?: string;
}

interface ArticleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleUrl: string;
  onConvert?: (articleDetail: ArticleDetail) => void;
  childAge?: number; // 選択中の子どもの年齢
}

// マークダウン風のテキストを分析してJSX要素に変換する関数
function parseContentToJSX(content: string) {
  return content.split('\n').map((line, index) => {
    // 引用コメントの処理 (> text → 引用スタイル)
    if (line.startsWith('> ')) {
      const quoteText = line.substring(2);
      return (
        <div key={index} className="border-l-4 border-blue-400 pl-4 py-2 my-3 bg-blue-50 text-gray-700 italic">
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
      return <div key={index}>{line}</div>;
    }
  });
}

export default function ArticleDetailModal({
  isOpen,
  onClose,
  articleUrl,
  onConvert,
  childAge
}: ArticleDetailModalProps) {
  const [articleDetail, setArticleDetail] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 変換機能用の状態
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertedArticle, setConvertedArticle] = useState<ConvertedArticle | null>(null);
  const [showConvertedModal, setShowConvertedModal] = useState(false);

  // モーダルが開いた時に記事詳細を取得
  useEffect(() => {
    if (isOpen && articleUrl) {
      fetchArticleDetail();
    }
  }, [isOpen, articleUrl]);

  const fetchArticleDetail = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 記事詳細取得開始: ${articleUrl}`);
      
      const apiUrl = `/api/news/detail?url=${encodeURIComponent(articleUrl)}`;
      const response = await fetch(apiUrl);
      
      // レスポンスがOKでない場合
      if (!response.ok) {
        console.warn(`API応答エラー: ${response.status}`);
        throw new Error(`APIエラー: ${response.status}`);
      }
      
      // JSONパースを安全に実行
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('JSON解析エラー:', jsonError);
        throw new Error('サーバーから無効な応答が返されました');
      }
      
      if (result.success) {
        setArticleDetail(result.article);
        console.log(`✅ 記事詳細取得完了: ${result.article.title}`);
      } else {
        throw new Error(result.error || '記事の詳細取得に失敗しました');
      }
    } catch (error) {
      console.error('記事詳細取得エラー:', error);
      setError(error instanceof Error ? error.message : '記事の詳細取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!articleDetail) return;
    
    setIsConverting(true);
    setConvertError(null);
    
    try {
      console.log(`🔄 記事変換開始: ${articleDetail.title}`);
      
      // 認証情報を取得
      const session = getAuthSession();
      if (!session) {
        throw new Error('認証情報がありません。再度ログインしてください。');
      }
      
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Session': JSON.stringify(session), // 認証ヘッダーを追加
        },
        body: JSON.stringify({
          title: articleDetail.title,
          content: articleDetail.content,
          originalUrl: articleDetail.url,
          image: articleDetail.image,
          source: articleDetail.source,
          childAge: childAge // 選択中の子どもの年齢を送信
        }),
      });
      
      if (!response.ok) {
        throw new Error(`変換APIエラー: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setConvertedArticle(result.convertedArticle);
        setShowConvertedModal(true);
        console.log(`✅ 記事変換完了: ${result.convertedArticle.title}`);
        
        // 元のモーダルを閉じる
        onClose();
      } else {
        throw new Error(result.error || '記事の変換に失敗しました');
      }
    } catch (error) {
      console.error('記事変換エラー:', error);
      setConvertError(error instanceof Error ? error.message : '記事の変換に失敗しました');
    } finally {
      setIsConverting(false);
    }
  };

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
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">📖 記事詳細</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 animate-spin">🔄</div>
              <div className="text-gray-600">記事を読み込み中...</div>
            </div>
          )}
          
          {error && (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">❌ {error}</div>
              <button
                onClick={fetchArticleDetail}
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                再試行
              </button>
            </div>
          )}
          
          {!isLoading && !error && articleDetail && (
            <div className="space-y-6">
              {/* 記事画像 */}
              {articleDetail.image && (
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src={articleDetail.image} 
                    alt={articleDetail.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* タイトル */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {articleDetail.title}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <span>📅 {new Date(articleDetail.publishedAt).toLocaleDateString('ja-JP')}</span>
                  <span>🏢 {articleDetail.source || 'ニュースソース'}</span>
                </div>
                
              </div>
              
              {/* 本文 */}
              <div className="prose max-w-none">
                <div className="text-gray-700 leading-relaxed">
                  {parseContentToJSX(articleDetail.content)}
                </div>
              </div>
              
              {/* 元記事リンク */}
              <div className="border-t border-gray-200 pt-4">
                <a 
                  href={articleDetail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 underline text-sm"
                >
                  🔗 元記事を開く
                </a>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        {!isLoading && !error && articleDetail && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            {convertError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                ❌ {convertError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                この記事を子供向けに変換しますか？
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={isConverting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isConverting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      変換中...
                    </>
                  ) : (
                    '🔄 変換する'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 変換された記事のモーダル */}
        {convertedArticle && (
          <ConvertedArticleModal
            isOpen={showConvertedModal}
            onClose={() => setShowConvertedModal(false)}
            convertedArticle={convertedArticle}
            originalUrl={articleDetail?.url || ''}
          />
        )}
      </div>
    </div>
  );
}