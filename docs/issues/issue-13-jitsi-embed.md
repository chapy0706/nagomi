---
status: open
created_at: 2026-05-21
closed_at:
---

# issue-13: Jitsi Meet 埋め込み基盤（VideoRoomGateway実装）

## 概要・背景・目的

nagomi の通話機能は Jitsi Meet（meet.jit.si）を iframe で埋め込む方式で実現する。
本 issue では VideoRoomGateway の抽象化と Jitsi 実装、および通話画面のオーバーレイUIを構築する。

完全無料での運用を成立させるための核となる選択。
SFU の自前運用や LiveKit のような商用サービスではなく、Jitsi の公開インスタンスを利用することで、月額コストをゼロに保つ。

## 受け入れ条件

- [ ] `VideoRoomGateway` ポートが domain 層に定義されている
- [ ] `JitsiVideoRoomGateway` が infrastructure 層に実装されている
- [ ] Jitsi の iframe API（external_api.js）を利用したラッパーが実装されている
- [ ] 通話開始時にカメラOFF・マイクONがデフォルトとして設定される
- [ ] 通話画面が既存の2Dフロアにオーバーレイ表示される（フロアからの脱出ではない）
- [ ] 通話中にもフロア上の自分のアバターは表示され続ける
- [ ] 通話オーバーレイの表示状態が Zustand store で管理されている
- [ ] 通話退出時に確実に iframe が破棄される（メモリリーク防止）
- [ ] Jitsi のイベント（参加・退出）を受信できる
- [ ] CSP で meet.jit.si を許可する設定が追加されている
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- iframe API のロード方法（script タグの動的挿入、または Next.js Script コンポーネント）
- ルームIDの命名規則: 衝突を避けるため `nagomi-{environment}-{room-type}-{uuid}` のような形式
- Jitsi のツールバーボタンは絞る（マイク、退出、チャット、手挙げ、タイル表示のみ）
- prejoinPageEnabled は false にする（既にロビー画面を独自実装するため）
- Jitsi のチャット機能を使うか、自前で実装するかを検討（初期は Jitsi のチャットを利用）
- 将来的に自前ホストの Jitsi に切り替える余地を残す（環境変数でドメインを切り替え可能に）

## 関連ADR・依存issue

- 関連ADR: ADR-002（なぜLiveKitではなくJitsi Meetを選んだか）、ADR-007（なぜカメラOFFをデフォルトとしたか）
- 依存: issue-10
- 後続: issue-14、issue-16

## 想定工数・優先度

- 工数: 2日
- 優先度: 最高
