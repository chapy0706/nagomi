---
status: open
created_at: 2026-05-21
closed_at:
---

# issue-10: presence同期基盤（Supabase Realtime接続）

## 概要・背景・目的

複数ユーザーの在席状態と位置をリアルタイムで同期する基盤を構築する。
Supabase Realtime の Presence 機能を活用し、サーバ運用を伴わずにスケーラブルな同期を実現する。

無料枠の制約（同時接続200、月200万メッセージ）を意識した設計が必要。
位置更新の頻度を抑える、状態の差分のみ送る、といった工夫を最初から組み込む。

受信した presence は Zustand store に集約し、複数のコンポーネント（フロア描画・参加者リスト・自分のステータスピル）がセレクタ経由で必要な部分だけ購読する。これにより presence 更新時の不要な再レンダリングを抑える。

## 受け入れ条件

- [ ] `PresenceGateway` ポートが domain 層に定義されている
- [ ] `SupabasePresenceGateway` が infrastructure 層に実装されている
- [ ] presence 状態を保持する Zustand store が presentation 層に実装されている
- [ ] store はセレクタで購読範囲を絞れる構造になっている（全体購読を強制しない）
- [ ] `EnterFloor` ユースケースが実装されている
- [ ] `LeaveFloor` ユースケースが実装されている
- [ ] presence チャネルへの参加・離脱が動作する
- [ ] 他ユーザーの参加・離脱イベントを受信し、store に反映できる
- [ ] presence の状態には EmployeeId、表示名、アバターURL、位置、ステータスが含まれる
- [ ] 切断検知後の自動復旧が実装されている（再接続ロジック）
- [ ] 同時接続上限に近づいた場合の警告ログが出る
- [ ] 統合テストで複数クライアントの同期が動作する
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- Zustand store は presentation 層に置く。domain / application 層は Zustand を知らない
- store にはサーバ状態（DBが真実の源のもの）を持たせない。Realtime 由来の同期状態と UI 状態に限定する
- presence チャネル名は環境ごとにプレフィックスを付ける（local/staging/production）
- 同一ユーザーが複数タブで開いた場合の挙動を定義する（最後の接続を有効、または明示エラー）
- presence データのペイロードサイズを最小化する（不要な情報を含めない）
- ネットワーク切断時の挙動として、サーバ側で5分後に自動退出させる
- React のレンダリング最適化（presence 更新で全アバターが再レンダリングされないように）

## 関連ADR・依存issue

- 関連ADR: ADR-003（なぜRenderでの自前WebSocketではなくSupabase Realtimeを選んだか）
- 依存: issue-08、issue-09
- 後続: issue-11、issue-12

## 想定工数・優先度

- 工数: 1〜2日
- 優先度: 高
