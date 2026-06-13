-- reports テーブルに category カラムを追加する
-- 通報カテゴリ: ハラスメント・不適切発言・規約違反・その他
-- reports は追記のみ（ログ系扱い）。UPDATE/DELETE ポリシーは設けない。

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('harassment', 'inappropriate_speech', 'rule_violation', 'other'));

COMMENT ON COLUMN reports.reported_employee_id IS
  '通報対象の社員ID（employees.id）。通報者IDはいかなるカラムにも保存しない。';
COMMENT ON COLUMN reports.category IS
  '通報カテゴリ: harassment / inappropriate_speech / rule_violation / other';
