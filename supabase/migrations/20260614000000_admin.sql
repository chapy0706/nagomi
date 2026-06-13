-- 管理者フラグ + 集計ビュー（個人特定情報を含まない）

-- employees に管理者フラグを追加
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- -----------------------------------------------
-- 集計ビュー（service_role のみがアクセスする）
-- 個人を特定できる情報は一切含まない
-- -----------------------------------------------

-- 日次アクティブユーザー数（直近30日、JST基準）
CREATE OR REPLACE VIEW v_admin_daily_active_users AS
SELECT
  (logged_in_at AT TIME ZONE 'Asia/Tokyo')::date AS day,
  COUNT(DISTINCT employee_auth_id)               AS active_users
FROM attendance_logs
WHERE logged_in_at >= now() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;

-- 曜日×時間帯の利用ヒートマップ（直近30日、JST基準）
CREATE OR REPLACE VIEW v_admin_hourly_heatmap AS
SELECT
  EXTRACT(DOW  FROM logged_in_at AT TIME ZONE 'Asia/Tokyo')::int AS day_of_week,
  EXTRACT(HOUR FROM logged_in_at AT TIME ZONE 'Asia/Tokyo')::int AS hour,
  COUNT(*)                                                        AS sessions
FROM attendance_logs
WHERE logged_in_at >= now() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY 1, 2;

-- 日次通話件数（直近30日、JST基準）
CREATE OR REPLACE VIEW v_admin_daily_calls AS
SELECT
  (joined_at AT TIME ZONE 'Asia/Tokyo')::date AS day,
  COUNT(*)                                    AS call_count
FROM call_participation_logs
WHERE joined_at >= now() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;

-- トピック別通話件数（直近30日）
CREATE OR REPLACE VIEW v_admin_topic_distribution AS
SELECT
  topic,
  COUNT(*) AS call_count
FROM call_participation_logs
WHERE joined_at >= now() - INTERVAL '30 days'
  AND topic IS NOT NULL
GROUP BY topic
ORDER BY call_count DESC;

-- 通報カテゴリ別件数（直近90日）
-- reported_employee_id は集計にのみ使用し、UIには表示しない
CREATE OR REPLACE VIEW v_admin_report_summary AS
SELECT
  category,
  COUNT(*)                             AS report_count,
  COUNT(DISTINCT reported_employee_id) AS distinct_targets
FROM reports
WHERE created_at >= now() - INTERVAL '90 days'
GROUP BY category
ORDER BY report_count DESC;
