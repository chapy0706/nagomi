-- call_invitations
-- 招待記録テーブル。追記のみ原則だが、status 列の終了確定更新（accepted/declined/expired）のみ例外的に UPDATE を許可する。
-- （attendance_logs.logged_out_at の確定更新と同じ扱い）

CREATE TABLE call_invitations (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_auth_id      uuid        NOT NULL REFERENCES auth.users(id),
  inviter_display_name text        NOT NULL,
  inviter_avatar_url   text,
  invitee_auth_id      uuid        NOT NULL REFERENCES auth.users(id),
  topic                text        CHECK (topic IN ('counseling', 'casual', 'meeting')),
  status               text        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at           timestamptz NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE call_invitations ENABLE ROW LEVEL SECURITY;

-- 招待者は自分が送った招待を INSERT できる
CREATE POLICY "call_invitations_insert_inviter" ON call_invitations
  FOR INSERT WITH CHECK (inviter_auth_id = auth.uid());

-- 招待者・被招待者ともに自分が関わる招待を SELECT できる（クールダウンチェック・受信確認用）
CREATE POLICY "call_invitations_select_participant" ON call_invitations
  FOR SELECT USING (inviter_auth_id = auth.uid() OR invitee_auth_id = auth.uid());

-- 被招待者のみ status を更新できる（issue-15: 承諾 / 辞退）
-- 誤操作防止のため status IN ('accepted', 'declined') のみ許可
CREATE POLICY "call_invitations_update_invitee_status" ON call_invitations
  FOR UPDATE USING (invitee_auth_id = auth.uid())
  WITH CHECK (status IN ('accepted', 'declined'));

-- 招待履歴は最低30日保持。pg_cron による定期削除は issue-26 で対応。
