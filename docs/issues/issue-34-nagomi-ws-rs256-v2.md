# Claude Code への指示書: nagomi-ws の RS256/JWKS 化（issue-33 フェーズ2・案A-1確定版）

nagomi-ws（Gleam）の JWT 検証を HS256 から RS256/JWKS に変え、Keアカウント発行の access token を WebSocket 接続時に検証する。トークンの受け渡しは案A-1（refresh token を本体の Postgres に保管し、WS 接続時に有効な access token を発行）で確定した。

この指示書は、先の調査で判明した「access_token / refresh_token が現状 jwt コールバックで破棄されている」という事実を前提に、それを保管する方向で設計を確定させたもの。

---

## 確定した設計（最初に共有する文脈）

```
トークン受け渡しは案A-1 で確定しました。

背景: 現在 auth.ts の jwt コールバックは keアカウントSub のみ保持し、
access_token / refresh_token を破棄しています。フェーズ2では
nagomi-ws が Keアカウント発行の access token を検証する必要があるため、
refresh_token を保管する方向に変更します。

確定した方式:
- refresh_token を本体の Postgres にセッション紐付けで保管する
  （cookie/session JWT には入れない。4KB 問題と漏洩面を避けるため）
- access_token は保持せず、必要時に refresh_token から取得する
- WS 接続は「接続時に一度だけ検証」する方式。接続中の access token
  失効（既定5分）は接続の信頼で吸収し、定期再検証はしない
- 再接続時は再度トークンを取得して再検証する
- nagomi-ws は Keアカウント発行 access token を RS256/JWKS で検証する

この方式を選んだ理由（要件）:
- 初回入室のホワイトリスト厳格性: WS 接続確立時に厳格検証し、
  意図しないメンバーの入室を弾く
- 在室の証跡: 誰がいつ接続し いつ切断したかを記録する
接続時検証 + 接続/切断記録で、この2要件が同時に満たされる。

絶対に守ること:
- 検証失敗・鍵取得失敗・トークン取得失敗は必ず deny
- WS_AUTH_DISABLED は全部できてから最後に外す
- refresh_token はブラウザに出さない（サーバー側に留める）
- ドメイン層・ports は不変
```

## 証跡の設計（要件2）

```
接続の開始と終了を記録します。既存の attendance_logs とは分けて、
技術的な接続証跡として専用に持ちます。

理由: attendance_logs は業務的な勤怠（出勤・退勤の意味）。
WS 接続は技術的事実（フロアにいた時間）。関心が異なるため混ぜない。
短い切断・再接続が勤怠に見えると意味が濁る。

記録内容（例。テーブル名や項目は設計に合わせて提案してください）:
- 誰が（employee の内部ID または auth_user_id）
- 接続開始時刻
- 接続終了時刻
- 接続元情報（任意）

まずこの証跡テーブルの設計（Drizzle スキーマ・マイグレーション）を
提案してください。ドメイン層に PresenceSession のような概念を置くか、
インフラ層の記録に留めるかも含めて相談させてください。
```

## ステップ0: refresh_token の保管を実装する（案A-1 の土台）

```
現在破棄している refresh_token を、本体の Postgres に
セッション紐付けで保管するよう変更します。

- auth.ts の jwt コールバックで refresh_token を破棄せず、
  Postgres のセッション用テーブルに保管する
- access_token は保持しない（必要時に refresh から取得）
- cookie / session JWT には refresh_token を入れない（4KB 回避・漏洩面縮小）
- セッション失効時・ログアウト時に refresh_token も破棄する

保管用テーブルの設計と、既存の next-auth セッションとの紐付け方を
説明してから実装してください。
```

確認ポイント: ログイン後、refresh_token が Postgres に安全に保管されること。cookie には出ていないこと。

## ステップ1: RS256/JWKS 実装の方針確定（Gleam）

先の調査で Claude Code が示した方針を採用する。

```
nagomi-ws の RS256/JWKS 検証を、以下の方針で実装します。
（先の調査方針を採用）

- JWKS 取得: gleam_httpc を追加（Erlang httpc・TLS対応・ネイティブ依存なし。
  alpine/aarch64 で安全）。certs エンドポイントから JWK 配列を取得し、
  既存の gleam_json で parse。
- 鍵キャッシュ: gleam_otp アクターで kid → 公開鍵(n,e) を保持。
  起動時と「未知 kid が来たとき」だけ JWKS を再取得（最小間隔を設けて
  無闇な再取得を防ぐ）。取得失敗・未知 kid のまま = deny。
- 署名検証: header を base64url デコードし kid と alg を取得。
  alg == "RS256" を厳格チェック（none/HS256 を弾く＝アルゴリズム混同攻撃対策）。
  n/e を base64url→バイナリにして OTP 標準の :crypto.verify(:rsa, :sha256, ...)
  を FFI で呼ぶ。crypto ライブラリは追加せず OTP 標準を使う。
- クレーム検証: iss / aud / exp を順に検査。1つでも不正なら deny。
- HS256 は RS256 に置換（Supabase を離れるので切替スイッチ不要）。
  extract_without_verify は WS_AUTH_DISABLED 経路専用として残す。

依存追加時は manifest.toml でバージョンを固定すること。
```

確認ポイント: 方針が明確で、gleam_httpc の追加とバージョン固定が合意されていること。

## ステップ2: JWKS 取得と鍵キャッシュ（アクター）

```
gleam_otp アクターで JWKS の鍵キャッシュ（kid → 公開鍵）を実装してください。
- 起動時に一度取得
- 未知 kid が来たら再取得（最小間隔あり）
- 取得失敗・未知 kid のまま = deny
並行接続でも安全であること（アクター経由）。
```

確認ポイント: 鍵を取得・キャッシュでき、取得失敗時に deny になること。

## ステップ3: RS256 署名検証

```
jwt.gleam を RS256 検証に対応させてください。
- header から kid / alg を取得。alg == "RS256" を厳格チェック
  （none / HS256 を弾く。アルゴリズム混同攻撃対策）
- kid に対応する公開鍵をキャッシュから引く
- OTP 標準の :crypto.verify を FFI で呼び署名検証
既存の HMAC FFI と同じ構造を踏襲してください。
```

確認ポイント: Keアカウント発行 JWT（RS256）の署名を検証でき、alg 混同攻撃が弾かれること。

## ステップ4: クレーム検証

```
署名検証の後、iss / aud / exp を検証してください。
- iss == KEYCLOAK_ISSUER
- aud に期待値（要確認。access token の aud が nagomi-web か account か
  実トークンで確認してから確定）を含む
- exp > 現在時刻（os:system_time FFI）
1つでも不正なら deny。各判断点に gated debug ログ。
```

確認ポイント: iss/aud/exp が検証され、不正トークンが弾かれること。実トークンで aud を確認済みであること。

## ステップ5: 本体の /api/ws-token エンドポイント（案A-1）

```
nagomi 本体に WS 接続用トークンを返すエンドポイントを実装してください。
- 認証済みユーザー（next-auth セッションあり）のみ許可、未認証は 401
- Postgres に保管した refresh_token を使い、Keアカウントから
  有効な access token を取得して返す
  （保管中の access token が期限内ならそれを、切れていれば
   refresh で取り直す）
- refresh も失敗したら 401（再ログインを促す）
- 返すのは access token のみ。refresh_token はブラウザに出さない

WebSocketClient.ts を、接続直前にこのエンドポイントから
access token を取得して WS 接続に渡すよう変更してください
（現在は Supabase セッションから取っている箇所）。
```

確認ポイント: 認証済みユーザーだけがトークンを取得でき、refresh_token がブラウザに出ないこと。

## ステップ6: 接続時検証と証跡記録

```
nagomi-ws の接続確立処理（router.gleam の入口）で、
検証成功時に接続開始を記録し、切断時に接続終了を記録してください。

- 接続時: RS256/JWKS 検証 → 成功なら接続確立 + 開始を記録
        → 失敗なら deny（ホワイトリスト厳格性）
- 切断時: 接続終了を記録（証跡の完成）

記録の書き込み先はステップ0/証跡設計で決めたテーブル。
nagomi-ws から本体DBへ記録する経路（直接 or 本体API経由）も
設計に合わせて提案してください。
```

確認ポイント: 接続の開始・終了が記録され、「誰がいつからいつまで」が追えること。

## ステップ7: 結合確認（WS_AUTH_DISABLED はまだ有効）

```
WS_AUTH_DISABLED=true のまま、検証ロジック単体を確認します。
- 正しい access token で検証が通る
- 不正 / 期限切れ / 署名違い / alg 混同 は弾かれる
- JWKS 取得失敗時は deny
- 証跡が記録される
確認手順を示してください。
```

確認ポイント: 検証が期待通り通す/弾き、証跡が残ること。

## ステップ8: WS_AUTH_DISABLED を外す（最終）

```
検証と証跡が正しく動くことを確認したら本番認証を有効化します。
- nagomi-ws の WS_AUTH_DISABLED を外す → 再デプロイ
- 確認:
  - トークン無し / 不正トークンの WS 接続が弾かれる（ホワイトリスト厳格性）
  - 正しいトークンで接続でき Presence が動く
  - 接続/切断の証跡が記録される
  - 再接続時に新トークンで再検証され接続できる
再デプロイ時は nagomi-ws の Traefik 動的設定とコンテナ名の更新を
忘れないこと（// 注意）。
```

確認ポイント: 不正接続が弾かれ、正しい接続と再接続が動き、証跡が残ること。

## デプロイ・インフラの注意

```
- nagomi-ws は erlang:27-alpine + aarch64。manifest.toml で依存固定
- nagomi-ws・本体・Keアカウントは全て coolify ネットワーク
  （JWKS 取得のため nagomi-ws → Keアカウントの到達性が必要）
- 再デプロイのたびにコンテナ名が変わる → Traefik 動的設定の url 更新（//注意）
- サブドメインは1段
```

## 進め方の原則

- 案A-1 確定。refresh_token は Postgres 保管、ブラウザに出さない
- WS は接続時検証のみ。接続中の失効は接続の信頼で吸収、再接続時に再検証
- 証跡（接続/切断）は attendance_logs と分けた専用テーブル（関心の分離）
- フェイルセーフは常に deny
- WS_AUTH_DISABLED は最後に外す
- 一区間ずつ、各区間後に確認
- 詰まったら判断点に gated debug ログを仕込んで計測で割る
