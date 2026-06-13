-- ログ削除バッチの手動実行スクリプト
--
-- 使用方法（ローカル Supabase 環境）:
--
--   psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/scripts/run-log-deletion.sql
--
-- または make コマンド:
--
--   make db/run-deletion
--
-- 本番環境（Supabase Dashboard の SQL エディタ）:
--
--   下記の SELECT 文をそのまま実行してください。
--   実行結果は deletion_audit_logs テーブルに記録されます。

SELECT run_log_deletion();

-- 実行後、削除メタログを確認:
SELECT
  executed_at AT TIME ZONE 'Asia/Tokyo' AS executed_at_jst,
  table_name,
  deleted_count,
  retention_months
FROM deletion_audit_logs
ORDER BY executed_at DESC
LIMIT 20;
