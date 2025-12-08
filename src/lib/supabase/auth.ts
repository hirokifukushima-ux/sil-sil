import { supabase } from './client';
import { AuthSession, setAuthSession, clearAuthSession } from '../auth';

/**
 * メールアドレスとパスワードでサインアップ
 * 既存の仮アカウントをSupabase Authに紐付ける
 */
export async function signUpWithEmail(
  userId: string,
  email: string,
  password: string,
  displayName: string
) {
  try {
    // Supabase Authでユーザー作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_id: userId, // 既存のユーザーIDを保存
          display_name: displayName
        }
      }
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('ユーザー作成に失敗しました');
    }

    return {
      success: true,
      authUserId: authData.user.id
    };
  } catch (error) {
    console.error('サインアップエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * メールアドレスとパスワードでログイン
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('ログインに失敗しました');
    }

    // ユーザーメタデータからユーザーIDを取得
    const userId = data.user.user_metadata?.user_id;

    if (!userId) {
      throw new Error('ユーザー情報が見つかりません');
    }

    return {
      success: true,
      userId: userId,
      email: data.user.email || '',
      displayName: data.user.user_metadata?.display_name || ''
    };
  } catch (error) {
    console.error('ログインエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * ログアウト
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    // ローカルセッションもクリア
    clearAuthSession();

    return { success: true };
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * 現在のSupabase Authセッションを取得
 */
export async function getSupabaseSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    return session;
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return null;
  }
}

/**
 * Supabase Authの状態変化を監視
 */
export function onAuthStateChange(
  callback: (session: any) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session);
  });
}

/**
 * パスワードリセットメール送信
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('パスワードリセットエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}
