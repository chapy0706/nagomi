-- ログ自動削除バッチ
--
-- 保持期間ルール（プライバシーポリシー準拠）:
--   attendance_logs        : 3ヶ月
--   call_participation_logs: 3ヶ月
--   satisfaction_responses : 3ヶ月
--   reports                : 12ヶ月（通報対応・不服申し立て対応期間を確保）
--
-- 物理削除はこのバッチのみが行う権限を持つ。
-- アプリケーションコードから DELETE を行ってはならない（追記のみログの原則）。

-- -----------------------------------------------
-- 削除実行メタログ（個人特定情報を含まない）
-- -----------------------------------------------
CREATE TABLE deletion_audit_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at      timestamptz NOT NULL DEFAULT now(),
  table_name       text        NOT NULL,
  deleted_count    integer     NOT NULL,
  retention_months integer     NOT NULL
);

COMMENT ON TABLE deletion_audit_logs IS
  'ログ削除バッチの実行記録。削除件数のみを保持し、個人を特定できる情報は含まない。';

-- service_role のみアクセス可（アプリ側 SELECT ポリシーなし）
ALTER TABLE deletion_audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 管理者ダッシュボード用ビュー（直近90日・直近50件）
-- -----------------------------------------------
CREATE OR REPLACE VIEW v_admin_deletion_audit AS
SELECT
  executed_at,
  table_name,
  deleted_count,
  retention_months
FROM deletion_audit_logs
WHERE executed_at >= now() - INTERVAL '90 days'
ORDER BY executed_at DESC
LIMIT 50;

-- -----------------------------------------------
-- 削除実行関数
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION run_log_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- attendance_logs: 3ヶ月保持
  DELETE FROM attendance_logs
    WHERE logged_in_at < now() - INTERVAL '3 months';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  INSERT INTO deletion_audit_logs (table_name, deleted_count, retention_months)
    VALUES ('attendance_logs', v_deleted, 3);

  -- call_participation_logs: 3ヶ月保持
  DELETE FROM call_participation_logs
    WHERE joined_at < now() - INTERVAL '3 months';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  INSERT INTO deletion_audit_logs (table_name, deleted_count, retention_months)
    VALUES ('call_participation_logs', v_deleted, 3);

  -- satisfaction_responses: 3ヶ月保持
  DELETE FROM satisfaction_responses
    WHERE submitted_at < now() - INTERVAL '3 months';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  INSERT INTO deletion_audit_logs (table_name, deleted_count, retention_months)
    VALUES ('satisfaction_responses', v_deleted, 3);

  -- reports: 12ヶ月保持（通報対応の都合上、保持期間を長く設定）
  DELETE FROM reports
    WHERE created_at < now() - INTERVAL '12 months';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  INSERT INTO deletion_audit_logs (table_name, deleted_count, retention_months)
    VALUES ('reports', v_deleted, 12);
END;
$$;

-- -----------------------------------------------
-- pg_cron ジョブ登録
-- 毎週月曜 18:00 UTC = 月曜 03:00 JST
--
-- 前提: Supabase ダッシュボードの「Database > Extensions」で
--       pg_cron を有効化してからマイグレーションを実行すること。
-- ローカル開発での pg_cron 有無に関わらず、
-- テーブル・関数の作成は常に実行される。
-- -----------------------------------------------
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- 既存ジョブを削除してから再登録（冪等性を確保）
    BEGIN
      PERFORM cron.unschedule('weekly-log-deletion');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- ジョブが存在しない場合は無視
    END;

    PERFORM cron.schedule(
      'weekly-log-deletion',    -- ジョブ名
      '0 18 * * 1',             -- 毎週月曜 18:00 UTC (= 火曜 03:00 JST)
      'SELECT run_log_deletion()'
    );

    RAISE NOTICE 'pg_cron ジョブ "weekly-log-deletion" を登録しました（毎週月曜 18:00 UTC）。';
  ELSE
    RAISE NOTICE 'pg_cron 拡張が見つかりません。Supabase ダッシュボードで有効化後、以下を手動実行してください:';
    RAISE NOTICE '  SELECT cron.schedule(''weekly-log-deletion'', ''0 18 * * 1'', ''SELECT run_log_deletion()'');';
  END IF;
END;
$outer$;
