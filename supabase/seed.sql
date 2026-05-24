-- seed データ（ローカル開発用）
-- 本番・ステージングには適用しないこと
-- auth_user_id は初回ログイン時に紐付けるため NULL のまま登録する

INSERT INTO employees (employee_id, display_name) VALUES
  ('100000001', 'User1'),
  ('100000002', 'User2'),
  ('100000003', 'User3'),
  ('100000004', 'User4'),
  ('100000005', 'User5');
