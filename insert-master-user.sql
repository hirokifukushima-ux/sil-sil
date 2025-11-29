-- マスターユーザーの作成
INSERT INTO users (
  id,
  email,
  display_name,
  user_type,
  is_active,
  created_by,
  created_at,
  last_login_at
) VALUES (
  gen_random_uuid(),
  'master@know-news.com',
  'マスター管理者',
  'master',
  true,
  'system',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email, display_name;
