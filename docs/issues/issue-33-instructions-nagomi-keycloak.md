# Claude Code への指示書: nagomi の認証を Keycloak に移行する（issue-33）

この指示書は issue-33 を Claude Code と並走して進めるためのもの。認証を Supabase Auth から Keycloak（OIDC）に移す。規模が大きく、ログイン UX が変わり、nagomi-ws の JWT 検証方式も変える。段階ごとに区切り、各段階で動作確認を挟む。

---

## 前提の共有（最初に Claude Code に伝える文脈）

```
nagomi の認証を Supabase Auth から Keycloak（OIDC）に移します。

確認済みの現状（issue-32 で判明した事実）:
- 認証は src/infrastructure/supabase/SupabaseAuthGateway.ts が
  client.auth.signInWithPassword を使っている
- 擬似メール（社員ID@employees.internal）+ PIN で認証
- employees.auth_user_id が認証側ユーザーの UUID と紐付いている
- AuthGateway は repositoryFactory に入っておらず、
  app/login/actions.ts が SupabaseAuthGateway を直接 new している
- nagomi-ws の JWT 検証は現在 HS256（src/nagomi_ws/jwt.gleam）
- 現在 WS_AUTH_DISABLED=true で WebSocket 認証は一時無効

決定した方針:
- ログイン UX は OIDC 標準のログイン画面に変える（独自フォーム廃止）
- Realm は nagomi 単体（全アプリ共通 SSO は将来）
- ホワイトリストは案A: employees は業務属性として残し、
  auth_user_id を Keycloak ユーザーの UUID（sub）に紐付け直す
- Keycloak は自己登録無効、管理者だけがユーザーを作る

アーキテクチャ上の絶対制約:
- src/domain/ は一切変更しない
- src/domain/ports/AuthGateway.ts のインターフェースは原則変更しない
  （必要なら最小限の変更にとどめ、理由を説明する）
- 新実装は src/infrastructure/keycloak/ 等に置く
- 既存の src/infrastructure/supabase/ は削除しない（切り戻し可能にする）
- 認証プロバイダを環境変数で切り替えられるようにする
  （DATA_PROVIDER と同じ発想。AUTH_PROVIDER=keycloak / supabase）

各ステップで以下を守ってください:
1. 何をするか・なぜそうするかを先に説明する
2. 一度に大量のコードを出さず、一つの責務ごとに区切る
3. 各ステップの最後に動作確認の方法を示す
4. 詰まったら区間で切り分ける
```

---

## デプロイ・インフラの既知事項（先に伝える）

```
- Keycloak は既に infra プロジェクトに存在（auth.chapy0706.com）
- nagomi 本体・nagomi-ws・Keycloak は全て coolify ネットワークにいる
- Coolify の自動生成 Traefik ラベルは壊れることがある
  → ルーティングは /data/coolify/proxy/dynamic/ の動的設定で直接書く
- サブドメインは1段厳守
- 設定ファイルはターミナルで直接編集（Obsidian 等でスマートクォート事故）
- cloudflared config.yml は tunnel/credentials-file 行を消さない
```

---

## ステップ1: ADR を2枚書く

```
認証を Keycloak に移すにあたり、ADR を2枚書きたいです。

1. 技術選定 ADR: 認証基盤に Keycloak + OIDC を採用、Auth.js を OIDC
   クライアントに使う。Supabase Auth から移行する理由を記す。
2. 設計思想 ADR: ADR-004（擬似メール+PIN）を supersede する。
   失うもの（低摩擦な PIN ログイン）と得るもの（標準化・関心の分離・
   SSO 基盤）のトレードオフ、ホワイトリストを案A で表現する判断を記す。

既存の docs/adr/ の形式に合わせてください。ADR-004 は削除せず
status を superseded に変え、新 ADR への参照を追記してください。
```

確認ポイント: ADR 2枚が既存形式で作られ、ADR-004 が superseded になること。

---

## ステップ2: Keycloak に Realm と Client を作る

これは Keycloak の管理画面操作なので手順を案内してもらう。

```
Keycloak（auth.chapy0706.com）に nagomi 用の Realm と Client を
作りたいです。以下を満たす設定手順を案内してください。

- Realm 名: nagomi
- 自己登録を無効化（管理者だけがユーザーを作れる）
- Client: nagomi-web（OIDC・confidential）
  - Valid redirect URIs: https://nagomi.chapy0706.com/api/auth/callback/keycloak
  - Web origins の設定
- Client secret の取得場所
- nagomi-ws が JWT 検証に使う JWKS エンドポイントの URL

各設定が「なぜ必要か」を添えて、管理画面のどこを操作するか示してください。
```

確認ポイント: nagomi Realm と nagomi-web Client ができ、client secret と JWKS URL が手元にあること。

---

## ステップ3: Auth.js（OIDC クライアント）を実装する

```
Auth.js（next-auth）で Keycloak の OIDC ログインを実装したいです。

- Keycloak provider を設定する
- 環境変数: KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET
- セッションに Keycloak の sub（ユーザー UUID）と access token を持たせる
  （access token は後で nagomi-ws に渡すため）

まず Auth.js の設定ファイルと、必要な環境変数を説明してから実装してください。
App Router 構成なので、それに合った形にしてください。
```

確認ポイント: Keycloak のログイン画面にリダイレクトし、認証後にセッションが張れること。

---

## ステップ4: AuthGateway の Keycloak 実装 + factory 統合

```
現在 app/login/actions.ts が SupabaseAuthGateway を直接 new しています。
これを整理し、認証プロバイダを切り替えられるようにしたいです。

1. src/infrastructure/keycloak/KeycloakAuthGateway.ts を実装する
   （AuthGateway インターフェースを満たす）
2. repositoryFactory に createAuthGateway() を追加する
   - AUTH_PROVIDER=keycloak → KeycloakAuthGateway
   - AUTH_PROVIDER=supabase（デフォルト）→ SupabaseAuthGateway
3. app/login/actions.ts を factory 経由に変える

AuthGateway インターフェースを見せるので、OIDC の文脈で
signIn/signOut/getAuthUserId 等がどうマッピングされるか説明してから
実装してください。OIDC ではパスワード照合をアプリが持たないため、
インターフェースの解釈が変わる点に注意して説明してください。
```

確認ポイント: AUTH_PROVIDER で Supabase と Keycloak を切り替えられること。ドメイン層は不変。

---

## ステップ5: ログインフローを OIDC リダイレクトに変える

```
app/login の擬似メール+PIN フォームを、Keycloak への OIDC
リダイレクトに変えたいです。

- 「ログイン」ボタンが Keycloak のログイン画面へ飛ばす
- 認証後 employees の業務属性（display_name 等）を解決する
- employees.auth_user_id = Keycloak の sub で照合する

既存の LoginForm と loginAction がどう変わるか説明してから実装してください。
```

確認ポイント: OIDC でログインでき、対応する employees の属性が解決されること。

---

## ステップ6: 既存ユーザーを Keycloak に移行する

```
現在 Supabase Auth と employees にいるユーザーを Keycloak に移します。

- 社員IDを Keycloak の username にしてユーザーを作る
- employees.auth_user_id を新しい Keycloak ユーザーの UUID に更新する
- 移行スクリプトまたは手順を作る

移行中の安全のため、AUTH_PROVIDER で切り戻せる状態を保ちながら
進める手順にしてください。一度に全ユーザーではなく、まずテスト
ユーザー1人で通すことを想定してください。
```

確認ポイント: テストユーザー1人が Keycloak 経由でログインでき、employees 属性も解決されること。

---

## ステップ7: 通し確認（認証のみ）

```
ここまでで、Keycloak ログイン → employees 属性解決 までを
通しで確認したいです。確認手順を示してください。
nagomi-ws（WebSocket）はまだ HS256 のままで、この段階では
WS_AUTH_DISABLED=true のままにしておきます。
```

確認ポイント: WebSocket 以外の機能が Keycloak 認証で動くこと。

---

## ステップ8: nagomi-ws の JWT 検証を RS256 / JWKS に変える

ここが技術的な山。issue-31 で JWT を触った経験が活きる。

```
nagomi-ws の JWT 検証を、Keycloak 発行の JWT に対応させたいです。

現状: src/nagomi_ws/jwt.gleam が HS256（共通鍵）で検証している。
変更後: Keycloak の JWKS エンドポイントから公開鍵を取得し、
        RS256 で検証する。

- JWKS エンドポイントから鍵を取得する（起動時にキャッシュ）
- RS256 署名検証を実装する
- Keycloak の access token をクライアントが WebSocket 接続時に渡す
- iss / aud クレームの検証も加える

私は Gleam で RS256/JWKS をやるのは初めてなので、
まず方針（どのライブラリを使うか、JWKS をどう取得・キャッシュするか）を
説明してから実装してください。Erlang の crypto FFI を使う可能性も含めて
検討してください。
```

確認ポイント: nagomi-ws が Keycloak 発行の JWT を RS256 で検証できること。

---

## ステップ9: WS_AUTH_DISABLED を外す

```
認証が通ったので、nagomi-ws の WS_AUTH_DISABLED を無効化したいです。
- Coolify の nagomi-ws 環境変数から WS_AUTH_DISABLED を外す
- 再デプロイ
- JWT なしの接続が弾かれ、Keycloak 発行の JWT で接続できることを確認

本番で WebSocket 認証が効いている状態を確認したいです。
```

確認ポイント: WS_AUTH_DISABLED を外すと、認証なしの WebSocket 接続が弾かれること。

---

## 進め方の原則

- 1ステップずつ進め、確認できてから次へ
- 詰まったら区間で切り分ける（Keycloak 設定 → Auth.js → factory → ログイン → 業務属性 → WS JWT）
- ステップ完了ごとに nagomi リポジトリに commit する
- 既存の Supabase 認証は最後まで消さない（AUTH_PROVIDER で切り戻せる状態を維持）
- ドメイン層・ports は原則不変。変える必要が出たら理由を説明してから
- ADR は受理後に書き換えず、覆ったら新 ADR で置換する
