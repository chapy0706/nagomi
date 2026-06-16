---
status: closed
created_at: 2026-06-16
closed_at: 2026-06-16
---

# Claude Code への指示書: nagomi-ws のデプロイ（issue-31）

ローカルに Docker は置かず、確認は A1 上で直接行う。段階ごとに区切り、各段階で動作確認を挟む。

---

## 前提の共有（最初に Claude Code に伝える文脈）

```
nagomi-ws（Gleam/OTP WebSocket サーバー）を A1 + Coolify にデプロイします。

環境の制約:
- A1 は aarch64 / ARM64・パブリックIPなし
- 外部公開は Cloudflare Tunnel 経由
- Coolify でコンテナ管理・Traefik でルーティング
- ローカルに Docker は置かない（確認は A1 上で行う）

今回のスコープ:
- nagomi-ws 単体のデプロイと疎通確認のみ
- nagomi 本体（Next.js）はまだデプロイしない
- JWT 検証は WS_AUTH_DISABLED=true で一時的にスキップして確認する

各ステップで以下を守ってください:
1. 何をするか・なぜそうするかを先に説明する
2. WebSocket 特有の注意点（プロトコルアップグレード等）があれば補足する
3. 各ステップの最後に A1 上での確認コマンドを示す
4. 詰まったら区間で切り分ける（コンテナ起動 → 内部疎通 → Tunnel → 外部接続）
```

---

## ステップ1: 確認用の JWT スキップを実装する

```
nagomi-ws の JWT 検証を、環境変数で一時的にスキップできるようにしたいです。

要件:
- WS_AUTH_DISABLED=true のときだけ検証をスキップする
- 未設定・false のときは必ず検証する（デフォルトは検証する）
- これは段階1の疎通確認のための一時措置で、本番では無効にする

jwt.gleam の検証箇所を、この分岐を入れる形に修正してください。
「なぜデフォルトを検証ありにするか」のセキュリティ上の理由も説明してください。
```

確認ポイント: 環境変数なしだと検証が走り、true で素通りすること。

---

## ステップ2: Coolify にデプロイする

```
nagomi-ws を Coolify の portfolios プロジェクトにデプロイします。

要件:
- Dockerfile.prod（multi-stage）を使う
- aarch64 ネイティブでビルドする
- Coolify の設定値（Build Pack・Dockerfile Location・Port）を明示する
- 環境変数 WS_AUTH_DISABLED=true を設定する

Coolify でどう設定すればよいか、画面の項目名つきで手順を示してください。
ビルドが通らない場合に備えて、A1 上で直接 docker build して確認する
コマンドも先に示してください。
```

確認ポイント: Coolify で Running になること。失敗時は A1 で直接ビルドして切り分ける。

---

## ステップ3: A1 内部で health 確認

```
デプロイした nagomi-ws が A1 内部で正しく起動しているか確認したいです。

- health エンドポイントが OK を返すか
- コンテナ名の確認方法
- docker logs での起動ログ確認方法

A1 上で叩く確認コマンドを示してください。
```

確認ポイント: health が OK を返すこと。

---

## ステップ4: Cloudflare Tunnel で公開する

```
nagomi-ws を Cloudflare Tunnel 経由で公開したいです。

要件:
- /etc/cloudflared/config.yml にサブドメインを追加する（例: ws.nagomi の形）
- cloudflared tunnel route dns で DNS を登録する
- Traefik のラベルで WebSocket のプロトコルアップグレードを通す

WebSocket は通常の HTTP と違いプロトコルアップグレードが必要です。
Traefik で WebSocket を通すために必要なラベル設定を説明してから示してください。
config.yml は sudo tee で全体を書き換える形で提示してください
（既存のホスト名を消さないよう、全体を含めて出す）。
```

確認ポイント: A1 内部から Host ヘッダ付きで叩いて WebSocket ハンドシェイクが通ること。

---

## ステップ5: 外部から接続確認

```
外部から WebSocket 接続できるか確認したいです。
ブラウザの開発者ツールか、簡単な確認用 HTML での接続方法を示してください。
接続が確立したら、ping/pong などで疎通を確認したいです。
```

確認ポイント: 外部から wss:// で接続が確立すること。

---

## ステップ6: 2接続の同期確認

```
2つの接続を開いて、Presence の同期が動くか確認したいです。
WS_AUTH_DISABLED=true の状態で、一方が位置を送ると他方に届くことを
確認する手順を示してください。
```

確認ポイント: 2接続で位置が同期すること。一方の切断が他方に影響しないこと。

---

## ステップ7: 確認完了後の片付け

```
疎通確認が終わったので、WS_AUTH_DISABLED を無効化したいです。
- Coolify の環境変数から WS_AUTH_DISABLED を外す（または false にする）
- 再デプロイして、認証なしでは接続できない状態に戻す

本番では必ず検証が効いている状態にする、という確認をしたいです。
```

確認ポイント: スキップを外すと JWT なしの接続が弾かれること。

---

## 進め方の原則

- 1ステップずつ進め、A1 上で確認できてから次へ
- 詰まったら区間で切り分ける（コンテナ起動 → health → Tunnel → 外部接続 → 同期）
- ステップ完了ごとに nagomi リポジトリに commit する
- WebSocket 特有のプロトコルアップグレードは Traefik 設定でつまずきやすいので注意する
- 確認が終わったら必ず WS_AUTH_DISABLED を外す（一時措置を残さない）
