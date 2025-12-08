import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { userId, email, password, displayName } = await request.json();

    if (!userId || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーID、メールアドレス、パスワードが必要です'
      }, { status: 400 });
    }

    const db = getDatabase();

    // 既存のユーザーを確認
    const existingUser = await db.getUser(userId);

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーが見つかりません'
      }, { status: 404 });
    }

    // Supabaseクライアントを作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Supabase Authでユーザー作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_id: userId,
          display_name: displayName || existingUser.displayName
        }
      }
    });

    if (authError) {
      return NextResponse.json({
        success: false,
        error: authError.message
      }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({
        success: false,
        error: 'アカウント作成に失敗しました'
      }, { status: 500 });
    }

    // 既存のユーザーレコードを更新（メールアドレスを保存）
    await db.updateUser(userId, {
      email,
      displayName: displayName || existingUser.displayName
    });

    console.log(`✅ アカウント保存完了: ${userId} -> ${email}`);

    return NextResponse.json({
      success: true,
      message: 'アカウントが保存されました',
      authUserId: authData.user.id
    });

  } catch (error) {
    console.error('アカウント保存エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'アカウント保存中にエラーが発生しました'
    }, { status: 500 });
  }
}
