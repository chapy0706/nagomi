-- seed データ（ローカル開発用）
-- 本番・ステージングには適用しないこと
-- supabase db reset で適用される

-- -----------------------------------------------
-- ホワイトリスト登録のみ（auth なし）
-- 統合テスト用ダミー社員
-- -----------------------------------------------
INSERT INTO employees (employee_id, display_name) VALUES
  ('100000001', 'User1'),
  ('100000002', 'User2'),
  ('100000003', 'User3'),
  ('100000004', 'User4'),
  ('100000005', 'User5');

-- -----------------------------------------------
-- テストアカウント（ログインまで通して確認できる）
--
-- 社員番号 : 200016186
-- PIN      : 000000
-- 表示名   : テストユーザー
--
-- 手順: supabase db reset を実行するとこのデータが投入される
-- -----------------------------------------------

-- auth ユーザー（固定 UUID で冪等性を確保）
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-200016186000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  '200016186@employees.internal',
  crypt('000000', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  '',
  '',
  ''
);

-- auth.identities（email ログインに必要）
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-200016186000',
  '00000000-0000-0000-0000-200016186000',
  '{"sub":"00000000-0000-0000-0000-200016186000","email":"200016186@employees.internal"}',
  'email',
  '200016186@employees.internal',
  now(),
  now(),
  now()
);

-- employees（auth_user_id 紐付け済み・同意済みでフロアに直入りできる）
INSERT INTO employees (employee_id, display_name, auth_user_id, consent_accepted_at) VALUES
  ('200016186', 'テストユーザー', '00000000-0000-0000-0000-200016186000', now());
