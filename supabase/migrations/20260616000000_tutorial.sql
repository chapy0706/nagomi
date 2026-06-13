-- チュートリアル完了状態を管理するカラム
-- NULL = 未表示（初回ログイン後に自動表示）
-- 設定済み = 完了またはスキップ済み（自動表示しない）
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz;
