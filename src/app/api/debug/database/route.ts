import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, checkDatabaseHealth } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 データベース診断開始...');
    
    // 環境変数チェック
    const envStatus = {
      USE_DATABASE: process.env.NEXT_PUBLIC_USE_DATABASE || 'false',
      SUPABASE_URL_SET: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      OPENAI_KEY_SET: !!process.env.OPENAI_API_KEY,
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
    };
    
    console.log('📊 環境変数状況:', envStatus);
    
    // データベースインスタンス取得
    const db = getDatabase();
    console.log('✅ データベースインスタンス取得完了');
    
    // ヘルスチェック実行
    console.log('🔄 ヘルスチェック実行中...');
    const healthStatus = await checkDatabaseHealth();
    console.log('📋 ヘルスチェック結果:', healthStatus);
    
    // 接続テスト
    let connectionTest = null;
    try {
      console.log('🔗 直接接続テスト中...');
      const testResult = await db.testConnection();
      connectionTest = { success: testResult };
      console.log('✅ 直接接続テスト結果:', testResult);
    } catch (error) {
      connectionTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      console.error('❌ 直接接続テストエラー:', error);
    }
    
    // 統計情報の取得
    let stats = null;
    try {
      console.log('📊 統計情報取得中...');
      stats = await db.getStats();
      console.log('✅ 統計情報取得完了:', stats);
    } catch (error) {
      console.error('❌ 統計情報取得エラー:', error);
      stats = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // 記事取得テスト
    let articlesTest = null;
    try {
      console.log('📚 記事取得テスト中...');
      const articles = await db.getArticles({ limit: 5 });
      articlesTest = { 
        success: true, 
        count: articles.length,
        articles: articles.map(article => ({
          id: article.id,
          title: article.convertedTitle.substring(0, 50),
          category: article.category,
          hasRead: article.hasRead,
          isArchived: article.isArchived,
          reactions: article.reactions,
          createdAt: article.createdAt
        }))
      };
      console.log('✅ 記事取得テスト結果:', articlesTest);
    } catch (error) {
      articlesTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      console.error('❌ 記事取得テストエラー:', error);
    }
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: envStatus,
      health: healthStatus,
      connectionTest,
      stats,
      articlesTest,
      recommendations: []
    };
    
    // 推奨事項生成
    if (!healthStatus.healthy) {
      diagnostics.recommendations.push('データベース接続が失敗しています。環境変数とSupabaseの設定を確認してください。');
    }
    
    if (envStatus.USE_DATABASE === 'true' && (!envStatus.SUPABASE_URL_SET || !envStatus.SUPABASE_KEY_SET)) {
      diagnostics.recommendations.push('Supabaseの環境変数が不完全です。NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。');
    }
    
    if (connectionTest?.success === false) {
      diagnostics.recommendations.push('Supabaseとの接続に失敗しています。ネットワーク接続とSupabaseのステータスを確認してください。');
    }
    
    if (articlesTest?.success === false) {
      diagnostics.recommendations.push('記事テーブルが存在しないか、アクセス権限がありません。Supabaseでテーブルを作成してください。');
    }
    
    if (articlesTest?.success === true && articlesTest.count === 0) {
      diagnostics.recommendations.push('記事テーブルは存在しますが、データがありません。記事変換を実行してデータを追加してください。');
    }
    
    console.log('🎯 診断完了:', diagnostics);
    
    return NextResponse.json({
      success: true,
      diagnostics,
      message: `データベース診断完了 (プロバイダー: ${healthStatus.provider})`
    });
    
  } catch (error) {
    console.error('❌ データベース診断エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}