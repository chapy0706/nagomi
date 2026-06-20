---
status: 承認
date: 2026-06-20
deciders: ちゃぴぃ
---

# ADR-009: 認証基盤に Keycloak + OIDC を採用し、OIDC クライアントに Auth.js を使う

## Context

ADR-004 では、メールアドレスを持たない派遣社員のために
擬似メール（`{employee_id}@employees.internal`）+ PIN による Supabase Auth 認証を採用した。
これは Supabase Auth の `signInWithPassword` に乗ることで JWT 発行・セッション管理・
RLS 統合を追加実装なしで得る、という判断だった。

issue-32 で DB・ストレージを Supabase から自己ホスト（A1 Postgres / MinIO）へ移したことで、
状況が変わった。

- RLS は ADR-008 によりアプリケーション層へ移譲済みで、認証が Supabase Auth である必然性が薄れた。
- 認証だけが Supabase に残ると、Supabase への依存が「認証のためだけ」になり、関心が分散する。
- 将来的に複数アプリ（nagomi 本体・nagomi-ws・他）で SSO を効かせたい要求が出てきた。
- nagomi-ws の JWT 検証は現在 HS256（共通鍵）で、鍵配布・ローテーションの運用が脆い。

一方、インフラ側には既に Keycloak（`auth.chapy0706.com`）が存在し、
OIDC プロバイダとして利用できる状態にある。

## Decision

認証基盤を **Keycloak（OIDC）** に移行する。
nagomi 本体の OIDC クライアントには **Auth.js（next-auth）** を採用する。

- Keycloak に `nagomi` Realm と `nagomi-web`（confidential）Client を作る。
- ログインは OIDC 標準のリダイレクトフロー（Authorization Code + PKCE）に統一し、
  独自の擬似メール + PIN フォームを廃止する。
- 認証プロバイダは環境変数 `AUTH_PROVIDER`（`keycloak` / `supabase`）で切り替える。
  ADR-008 の `DATA_PROVIDER` と同じ発想で、切り戻し可能性を維持する。
- Supabase Auth の実装（`SupabaseAuthGateway` 等）は削除せず残す。
- nagomi-ws の JWT 検証は HS256 から、Keycloak の JWKS による **RS256** 検証へ変更する（別ステップ）。

## Rationale

### Keycloak + OIDC を選んだ理由

**標準プロトコルへの回帰。**
OIDC は認証の業界標準であり、トークン発行・introspection・ログアウト・鍵公開（JWKS）が
仕様として定義されている。自前・準自前の認証を続けるより、標準に乗るほうが
長期の保守性とエコシステム互換性が高い。

**関心の分離。**
認証を Keycloak に集約することで、nagomi 本体・nagomi-ws・A1 Postgres は
「認証済みユーザーの sub（UUID）」だけを受け取り、認証ロジックを持たなくてよくなる。
DB を自己ホストへ移した今、認証も独立サービスに寄せたほうが構成が素直になる。

**SSO 基盤の確保。**
Realm を共有すれば、将来 nagomi 以外のアプリも同じ Keycloak で SSO できる。
今回は `nagomi` Realm 単体で始めるが、拡張余地を残す。

**鍵管理の改善。**
HS256 の共通鍵は配布・保管・ローテーションが脆い。
Keycloak は署名鍵を持ち公開鍵を JWKS で配るため、nagomi-ws は公開鍵を取得して
RS256 検証するだけでよく、秘密鍵を共有しなくて済む。

### OIDC クライアントに Auth.js を選んだ理由

**App Router ネイティブ。**
Auth.js は Next.js App Router 構成（Route Handler / middleware / server actions）に統合でき、
Cookie ベースのセッション・CSRF 対策・トークンの保持を標準で扱える。

**Keycloak provider が標準提供されている。**
`next-auth/providers/keycloak` があり、issuer・client id・client secret を渡すだけで
Authorization Code フローが成立する。OIDC の細部を自前で書かずに済む。

**access token をセッションに載せられる。**
Keycloak の access token をセッションへ保持しておけば、
WebSocket 接続時に nagomi-ws へ渡して RS256 検証させる導線が作れる。

### Supabase Auth を残す理由

切り戻し可能性のため。`AUTH_PROVIDER` のデフォルトは当面 `supabase` とし、
Keycloak 側が安定してから既定を切り替える。
これは ADR-008 の `DATA_PROVIDER` と同じ運用方針。

## Consequences

### 良い結果

- 認証が標準 OIDC に統一され、トークン・鍵・ログアウトの扱いが仕様準拠になる。
- 認証が独立サービスに分離され、本体・ws・DB は sub を受け取るだけになる。
- 共通鍵の配布が消え、nagomi-ws は JWKS で公開鍵を取得できる（鍵運用が改善）。
- `AUTH_PROVIDER` で Supabase 認証へ切り戻せるため、移行リスクが下がる。

### 引き受けるトレードオフ

- 低摩擦な PIN ログイン UX を失う（詳細は ADR-010）。
- Keycloak という運用対象が増える（Realm・Client・ユーザー・鍵の管理）。
- access token のライフサイクル（失効・更新）を Auth.js 側で扱う必要がある。
- nagomi-ws の JWT 検証を HS256 から RS256/JWKS へ作り変える実装コストが生じる。

### 今後の見直し条件

- Keycloak の運用負荷が想定を大きく超えた場合。
- OIDC 以外の認証要件（外部 IdP フェデレーション等）が浮上した場合。

## 関連

- ADR-004（擬似メール + PIN）を ADR-010 が supersede する。
- ADR-008（A1 Postgres はアプリ層で認可）。RLS 移譲が本決定の前提。
