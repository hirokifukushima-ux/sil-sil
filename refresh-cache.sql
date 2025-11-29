-- Supabaseのスキーマキャッシュをリフレッシュ
NOTIFY pgrst, 'reload schema';
