-- satisfaction_responses に survey_type / nps_score を追加
-- 匿名性はスキーマで保証（employee_id 列は存在しない）

ALTER TABLE satisfaction_responses
  ADD COLUMN IF NOT EXISTS survey_type text NOT NULL DEFAULT 'session'
    CHECK (survey_type IN ('session', 'nps')),
  ADD COLUMN IF NOT EXISTS nps_score integer
    CHECK (nps_score IS NULL OR nps_score BETWEEN 0 AND 10);

-- 管理者ダッシュボード向け集計ビュー（個人特定情報を含まない）
CREATE OR REPLACE VIEW v_admin_satisfaction_summary AS
SELECT
  date_trunc('week', submitted_at AT TIME ZONE 'Asia/Tokyo') AS week,
  survey_type,
  COUNT(*)                                                    AS response_count,
  ROUND(AVG(rating)::numeric, 2)                             AS avg_rating,
  ROUND(AVG(nps_score)::numeric, 2)                          AS avg_nps
FROM satisfaction_responses
WHERE submitted_at >= now() - INTERVAL '90 days'
GROUP BY 1, 2
ORDER BY 1;
