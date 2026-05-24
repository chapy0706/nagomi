-- nagomi 初期スキーマ
-- ログ系テーブルは追記のみ（append-only）。logged_out_at / left_at の確定更新のみ例外。

-- -----------------------------------------------
-- employees
-- ホワイトリスト本体。auth.users とは別管理。
-- -----------------------------------------------
CREATE TABLE employees (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         text        UNIQUE NOT NULL CHECK (employee_id ~ '^[0-9]{9}$'),
  auth_user_id        uuid        UNIQUE REFERENCES auth.users(id),
  display_name        text        NOT NULL,
  avatar_url          text,
  is_active           boolean     NOT NULL DEFAULT true,
  consent_accepted_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 自分のレコードのみ参照可能
CREATE POLICY "employees_select_own" ON employees
  FOR SELECT USING (auth_user_id = auth.uid());

-- INSERT / UPDATE / DELETE は service_role のみ（ポリシーなし = 拒否）

-- -----------------------------------------------
-- attendance_logs（追記のみ）
-- -----------------------------------------------
CREATE TABLE attendance_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_auth_id uuid        NOT NULL REFERENCES auth.users(id),
  logged_in_at     timestamptz NOT NULL DEFAULT now(),
  logged_out_at    timestamptz,                          -- 退出確定時のみ更新
  source           text        NOT NULL CHECK (source IN ('explicit', 'inferred'))
);

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_logs_select_own" ON attendance_logs
  FOR SELECT USING (employee_auth_id = auth.uid());

CREATE POLICY "attendance_logs_insert_own" ON attendance_logs
  FOR INSERT WITH CHECK (employee_auth_id = auth.uid());

-- -----------------------------------------------
-- call_participation_logs（追記のみ）
-- -----------------------------------------------
CREATE TABLE call_participation_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_auth_id uuid        NOT NULL REFERENCES auth.users(id),
  room_id          text        NOT NULL,
  topic            text        CHECK (topic IN ('counseling', 'casual', 'meeting')),
  joined_at        timestamptz NOT NULL DEFAULT now(),
  left_at          timestamptz                           -- 退出確定時のみ更新
);

ALTER TABLE call_participation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_participation_logs_select_own" ON call_participation_logs
  FOR SELECT USING (employee_auth_id = auth.uid());

CREATE POLICY "call_participation_logs_insert_own" ON call_participation_logs
  FOR INSERT WITH CHECK (employee_auth_id = auth.uid());

-- -----------------------------------------------
-- reports（通報者IDを構造的に保存しない）
-- -----------------------------------------------
CREATE TABLE reports (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_employee_id uuid        NOT NULL REFERENCES employees(id),
  content              text        NOT NULL,
  context              jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは INSERT のみ可（SELECT は service_role のみ）
CREATE POLICY "reports_insert_authenticated" ON reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- -----------------------------------------------
-- satisfaction_responses（employee_id を持たない）
-- -----------------------------------------------
CREATE TABLE satisfaction_responses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rating       integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE satisfaction_responses ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは INSERT のみ可（SELECT は service_role のみ）
CREATE POLICY "satisfaction_responses_insert_authenticated" ON satisfaction_responses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
