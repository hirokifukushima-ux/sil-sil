import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 管理用マイグレーションAPI
 * accepted_user_idカラムを追加して既存データを更新
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('マイグレーション開始...');

    // Step 1: カラムを追加（すでに存在する場合はスキップ）
    console.log('Step 1: accepted_user_idカラムを追加中...');
    const { error: alterError } = await supabase
      .from('invitations')
      .select('accepted_user_id')
      .limit(1);

    // カラムが存在しない場合のエラーを無視（既に存在する場合は何もしない）
    if (alterError) {
      console.log('カラムが存在しないようです。SQL実行が必要です。');
      return NextResponse.json({
        success: false,
        message: 'accepted_user_idカラムの追加にはSupabase SQL Editorで以下のSQLを実行してください:\nALTER TABLE invitations ADD COLUMN IF NOT EXISTS accepted_user_id TEXT REFERENCES users(id);',
        needsManualMigration: true
      });
    }

    console.log('✓ accepted_user_idカラムは既に存在します');

    // Step 2: 既存の accepted 状態の招待で accepted_user_id が NULL のものを更新
    console.log('Step 2: 既存データを更新中...');

    // 全ての accepted 状態の招待を取得
    const { data: acceptedInvitations, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('status', 'accepted')
      .is('accepted_user_id', null);

    if (fetchError) {
      throw new Error(`招待取得エラー: ${fetchError.message}`);
    }

    console.log(`更新対象の招待: ${acceptedInvitations?.length || 0}件`);

    let updatedCount = 0;

    // 各招待について対応するユーザーを検索して更新
    for (const invitation of acceptedInvitations || []) {
      // 対応するユーザーを検索
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_type', invitation.target_type)
        .eq('created_by', invitation.inviter_id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (userError) {
        console.error(`ユーザー検索エラー (invitation ${invitation.code}):`, userError);
        continue;
      }

      if (users && users.length > 0) {
        const user = users[0];

        // accepted_user_id を更新
        const { error: updateError } = await supabase
          .from('invitations')
          .update({ accepted_user_id: user.id })
          .eq('code', invitation.code);

        if (updateError) {
          console.error(`招待更新エラー (${invitation.code}):`, updateError);
        } else {
          console.log(`✓ 招待 ${invitation.code} を更新 → user ${user.id}`);
          updatedCount++;
        }
      } else {
        console.log(`⚠ 招待 ${invitation.code} に対応するユーザーが見つかりません`);
      }
    }

    // Step 3: 結果を確認
    console.log('Step 3: 結果を確認中...');
    const { data: result, error: resultError } = await supabase
      .from('invitations')
      .select('code, email, target_type, status, accepted_user_id')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (resultError) {
      throw new Error(`結果確認エラー: ${resultError.message}`);
    }

    console.log('マイグレーション完了！');

    return NextResponse.json({
      success: true,
      message: 'マイグレーションが正常に完了しました',
      updatedCount,
      acceptedInvitations: result
    });

  } catch (error) {
    console.error('マイグレーション実行エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'マイグレーション中にエラーが発生しました'
      },
      { status: 500 }
    );
  }
}

// GETリクエストで現在の状態を確認
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('invitations')
      .select('code, email, target_type, status, accepted_user_id')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      acceptedInvitations: data,
      needsMigration: data?.some(inv => !inv.accepted_user_id) || false
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '状態確認中にエラーが発生しました'
      },
      { status: 500 }
    );
  }
}
