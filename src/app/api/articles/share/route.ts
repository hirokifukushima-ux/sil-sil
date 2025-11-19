import { NextRequest, NextResponse } from 'next/server';
import { fetchArticleMetadata, convertToArticleContent } from '@/lib/article-fetcher';
import { convertArticleForChild } from '@/lib/openai';
import { getDatabase, DatabaseError } from '@/lib/database';

interface ShareArticleRequest {
  url: string;
  childAge: number;
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（親ユーザーのみ）
    const authHeader = request.headers.get('authorization') || request.headers.get('x-auth-session');

    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: '認証情報が必要です'
      }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(authHeader);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: '認証情報が無効です'
      }, { status: 401 });
    }

    if (session.userType !== 'parent') {
      return NextResponse.json({
        success: false,
        error: '親アカウントのみ利用可能です'
      }, { status: 403 });
    }

    const parentId = session.userId;

    const body: ShareArticleRequest = await request.json();
    const { url, childAge } = body;

    // バリデーション
    if (!url) {
      return NextResponse.json(
        { error: 'URLが必要です' },
        { status: 400 }
      );
    }

    if (!childAge || childAge < 6 || childAge > 15) {
      return NextResponse.json(
        { error: '年齢は6歳から15歳の間で入力してください' },
        { status: 400 }
      );
    }

    // URLの形式チェック
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: '有効なURLを入力してください' },
        { status: 400 }
      );
    }
    
    // 1. 記事メタデータを取得 - Yahoo!ニュースの場合は専用APIを使用
    console.log('📰 記事メタデータを取得中...', url);
    
    let rawArticleData;
    let articleContent;
    
    if (url.includes('news.yahoo.co.jp')) {
      console.log('🔄 Yahoo!ニュース専用ロジックを使用...');
      
      // Yahoo!記事詳細取得APIを内部的に呼び出し
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
      console.log(`🔗 内部API呼び出し: ${baseUrl}/api/news/detail`);
      
      const yahooResponse = await fetch(`${baseUrl}/api/news/detail?url=${encodeURIComponent(url)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; InternalAPICall/1.0)',
        }
      });
      
      if (!yahooResponse.ok) {
        throw new Error(`Yahoo!API呼び出しエラー: ${yahooResponse.status} ${yahooResponse.statusText}`);
      }
      
      const yahooResult = await yahooResponse.json();
      
      if (yahooResult.success) {
        const yahooArticle = yahooResult.article;
        rawArticleData = {
          title: yahooArticle.title,
          description: yahooArticle.summary,
          content: yahooArticle.content,
          image: yahooArticle.image,
          url: yahooArticle.url,
          site_name: yahooArticle.source
        };
        articleContent = convertToArticleContent(rawArticleData);
      } else {
        throw new Error(`Yahoo!記事取得エラー: ${yahooResult.error}`);
      }
    } else {
      // 通常の記事取得
      rawArticleData = await fetchArticleMetadata(url);
      articleContent = convertToArticleContent(rawArticleData);
    }
    
    console.log('✅ 記事データ取得完了:', {
      title: articleContent.title.substring(0, 50),
      contentLength: articleContent.content.length,
      category: articleContent.category
    });
    
    // 2. AIで子供向けに変換
    console.log('🤖 AI変換を実行中...', { 
      childAge, 
      category: articleContent.category,
      environment: process.env.NODE_ENV,
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      openAiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10)
    });
    
    const convertedArticle = await convertArticleForChild(articleContent, childAge);
    
    console.log('✅ AI変換完了:', {
      originalTitle: articleContent.title.substring(0, 30),
      convertedTitle: convertedArticle.title.substring(0, 30),
      contentLength: convertedArticle.content.length
    });
    
    // 3. 新しいデータベース抽象化層に保存
    let savedArticle;
    
    try {
      console.log('💾 データベースに保存中...');
      const db = getDatabase();
      const articleData = {
        originalUrl: url,
        childAge,
        originalTitle: articleContent.title,
        convertedTitle: convertedArticle.title,
        originalContent: articleContent.content,
        convertedContent: convertedArticle.content,
        convertedSummary: convertedArticle.summary,
        category: convertedArticle.category,
        status: 'completed',
        siteName: rawArticleData.site_name,
        image: rawArticleData.image,
        hasRead: false,
        reactions: [],
        isArchived: false,
        parentId: parentId // 親アカウントIDを設定
      };

      savedArticle = await db.createArticle(articleData);
      console.log('✅ データベース保存完了:', savedArticle.id, 'parentId:', parentId);
      
    } catch (dbError) {
      console.warn('⚠️ データベース保存失敗、ローカルストレージのみで対応:', dbError);
      
      // データベース保存失敗時は、変換結果だけでも返す
      savedArticle = {
        id: Date.now(), // 一時的なID
        originalUrl: url,
        childAge,
        originalTitle: articleContent.title,
        convertedTitle: convertedArticle.title,
        originalContent: articleContent.content,
        convertedContent: convertedArticle.content,
        convertedSummary: convertedArticle.summary,
        category: convertedArticle.category,
        status: 'completed',
        siteName: rawArticleData.site_name,
        image: rawArticleData.image,
        hasRead: false,
        reactions: [],
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    const message = savedArticle.id > 1000000000000 // 一時的IDの場合
      ? 'AI変換が完了しました！ローカルストレージに保存されました。'
      : 'AI変換が完了しました！子供がニュースページで読めるようになりました。';
    
    console.log('🎉 記事の変換が完了しました:', message);
    
    return NextResponse.json({
      success: true,
      article: savedArticle,
      message,
      metadata: {
        processingTime: Date.now(),
        originalLength: articleContent.content.length,
        convertedLength: convertedArticle.content.length,
        compressionRatio: Math.round((convertedArticle.content.length / articleContent.content.length) * 100),
        databaseSaved: savedArticle.id <= 1000000000000
      }
    });
    
  } catch (error) {
    console.error('❌ 記事処理エラー:', error);
    
    // DatabaseErrorの特別処理
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { 
          error: `データベースエラー: ${error.message}`,
          code: error.code,
          suggestion: 'データベース接続を確認してください。'
        },
        { status: 500 }
      );
    }
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
    }
    
    return NextResponse.json(
      { 
        error: `記事の処理中にエラーが発生しました`,
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'URLが正しいか確認し、しばらく待ってから再試行してください。'
      },
      { status: 500 }
    );
  }
}