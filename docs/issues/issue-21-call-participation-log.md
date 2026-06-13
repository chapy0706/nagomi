---
status: closed
created_at: 2026-05-21
closed_at: 2026-06-13
---

# issue-21: 通話参加ログ記録（CallParticipationLog）

## 概要・背景・目的

通話への参加・退出のタイムスタンプを記録する。
Jitsi の videoConferenceJoined / videoConferenceLeft イベントを起点として、確実なタイミングで記録する。

業務影響の把握だけでなく、利用統計の元データとしても活用される。
ただし個別の通話相手や内容は記録せず、「誰がいつどのルームで通話したか」のメタ情報のみに留める。

## 受け入れ条件

- [ ] `call_participation_logs` テーブルのマイグレーションが追加されている
- [ ] `CallParticipationLog` エンティティが domain 層に実装されている
- [ ] call_participation_logs は追記のみ。INSERT と、終了時刻（left_at）の確定 UPDATE のみを許す
- [ ] RLS により、ユーザーは自分のレコードのみ SELECT 可能
- [ ] `RecordCallJoin` ユースケースが実装されている
- [ ] `RecordCallLeave` ユースケースが実装されている
- [ ] Jitsi の videoConferenceJoined イベントで RecordCallJoin が呼ばれる
- [ ] Jitsi の videoConferenceLeft イベントで RecordCallLeave が呼ばれる
- [ ] 異常終了（ブラウザクラッシュ等）の場合、24時間以内に left_at NULL のレコードを自動補完する
- [ ] トピック種別がログに含まれる
- [ ] 統合テストで参加・退出の記録が動作する
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- left_at の確定以外で行を書き換えない（追記のみログの原則）
- 通話相手の情報は記録しない（プライバシー保護）
- room_id は記録するが、会議室の物理的な特定よりも「同じルームに居た」という事実の集計に使う
- 異常終了の補完バッチは別途実装（運用基盤側）
- 通話時間の合計を管理者ダッシュボードで集計可能にする
- 保存期間は3ヶ月（後続の自動削除バッチで対応）

## 関連ADR・依存issue

- 関連ADR: なし
- 依存: issue-13、issue-15
- 後続: issue-22、issue-26

## 想定工数・優先度

- 工数: 1日
- 優先度: 高
