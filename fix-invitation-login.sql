-- 招待コード再ログイン問題の修正
-- invitations テーブルに accepted_user_id カラムを追加

-- 1. カラムを追加
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS accepted_user_id UUID REFERENCES users(id);

-- 2. 既存の accepted 状態の招待コードに対して、正しい accepted_user_id を設定
-- （created_by が invitation.inviter_id と一致する最初のユーザーを設定）
UPDATE invitations i
SET accepted_user_id = (
  SELECT u.id
  FROM users u
  WHERE u.created_by = i.inviter_id
    AND u.user_type = i.target_type
    AND (u.email = i.email OR u.email IS NULL OR i.email IS NULL)
  ORDER BY u.created_at ASC
  LIMIT 1
)
WHERE i.status = 'accepted'
  AND i.accepted_user_id IS NULL;

-- 3. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_user_id
ON invitations(accepted_user_id);

-- 4. 確認クエリ
SELECT
  code,
  email,
  target_type,
  status,
  accepted_user_id,
  (SELECT display_name FROM users WHERE id = accepted_user_id) as accepted_user_name
FROM invitations
WHERE status = 'accepted'
ORDER BY created_at DESC;
