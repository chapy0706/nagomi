-- block_relations
-- ブロック関係を表す状態テーブル（ログ系ではない）。
-- ブロック解除に伴う DELETE を許容する。自己ブロック禁止・重複禁止。

CREATE TABLE block_relations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_auth_id uuid        NOT NULL REFERENCES auth.users(id),
  blocked_auth_id uuid        NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT block_relations_unique UNIQUE (blocker_auth_id, blocked_auth_id),
  CONSTRAINT block_relations_no_self CHECK (blocker_auth_id <> blocked_auth_id)
);

ALTER TABLE block_relations ENABLE ROW LEVEL SECURITY;

-- 自分がブロックした相手の一覧のみ参照可能（ブロックされた側は自分がブロックされた事実を知れない）
CREATE POLICY "block_relations_select_own" ON block_relations
  FOR SELECT USING (blocker_auth_id = auth.uid());

-- 自分によるブロック登録のみ許可
CREATE POLICY "block_relations_insert_own" ON block_relations
  FOR INSERT WITH CHECK (blocker_auth_id = auth.uid());

-- 自分によるブロック解除のみ許可
CREATE POLICY "block_relations_delete_own" ON block_relations
  FOR DELETE USING (blocker_auth_id = auth.uid());

-- 招待フローでの「被招待者が招待者をブロックしているか」確認用 RPC。
-- SECURITY DEFINER により auth.uid()（招待者）が被招待者にブロックされているかを確認できる。
-- ブロックされた側には理由を伝えないため、呼び出し結果は UI では汎用メッセージで表示する。
CREATE OR REPLACE FUNCTION public.is_blocked_by(p_potential_blocker uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM block_relations
    WHERE blocker_auth_id = p_potential_blocker
      AND blocked_auth_id = auth.uid()
  );
$$;
