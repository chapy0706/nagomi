---
status: 承認
date: 2026-06-20
deciders: ちゃぴぃ
supersedes: ADR-004
---

# ADR-010: ホワイトリストを業務属性として残し、認証主体を Keycloak の sub に紐付け直す（ADR-004 を supersede）

## Context

ADR-004 は、メールアドレスを持たない派遣社員の認証を成立させるために
擬似メール + PIN による Supabase Auth を採用した。
当時の制約は2つ。「ユーザーはメールアドレスを持たない」「完全なホワイトリストにしたい」。

ADR-009 で認証基盤を Keycloak（OIDC）へ移すと決めた。
これにより認証主体は Supabase Auth の `auth.users` ではなく Keycloak のユーザーになる。
このとき、これまで `employees` テーブルが担ってきた役割
（① 認証を許可する社員の台帳＝ホワイトリスト、② 表示名やアバター等の業務属性）を
どう再配置するかを決める必要がある。

検討した案は2つ。

- **案A**: `employees` は業務属性の台帳として残し、`auth_user_id` を
  Keycloak ユーザーの UUID（`sub`）へ紐付け直す。認証主体は Keycloak、業務属性は employees。
- **案B**: `employees` を廃し、表示名・アバター等を含めて全属性を Keycloak のユーザー属性へ寄せる。

## Decision

**案A を採用する。**

- `employees` テーブルは「業務属性の台帳」として残す（display_name・avatar_url・is_active・is_admin 等）。
- `employees.auth_user_id` を Keycloak ユーザーの `sub`（UUID）へ紐付け直す。
- ホワイトリスト性は引き続き「`employees` に在籍し `is_active = true` であること」で担保する。
  Keycloak 側は自己登録を無効化し、管理者だけがユーザーを作る。
- ログイン後、`employees.auth_user_id = Keycloak の sub` で業務属性を解決する。
- ADR-004 を **superseded** とする（削除はしない）。

## Rationale

### 案A を選んだ理由

**業務属性とドメインモデルを壊さない。**
nagomi のドメイン層・Use Case は `Employee`（display_name・avatar_url 等）を中心に組まれている。
業務属性を Keycloak へ全部移すと、表示のたびに Keycloak へ問い合わせる必要が生じ、
ドメインの所有物が認証サービスへ漏れ出す。業務属性は nagomi の DB に置くのが自然。

**ホワイトリストの二重化を避けつつ堅くする。**
ホワイトリストの実体は `employees` に一本化する。
Keycloak の自己登録無効化は「アカウント発行を管理者に限る」ための防御で、
「nagomi にログインできるか」の最終判定は `employees` 在籍 + `is_active` で行う。
退職処理は ADR-004 同様 `is_active = false` で完結し、過去ログとの整合も保てる。

**`auth_user_id` の差し替えだけで認証主体を移せる。**
`employees` のスキーマ・ドメインは不変のまま、`auth_user_id` の値を
Supabase の UUID から Keycloak の sub へ更新するだけで移行できる。
これは ADR-004 が「将来の認証方式変更の影響範囲を小さくする」と述べた設計が
実際に効くことを意味する。

### 案B を不採用とした理由

表示名・アバターのような頻繁に読む業務属性を認証サービスに置くと、
読み取り経路が Keycloak に依存し、可用性・性能・関心分離の面で不利になる。
Keycloak はあくまで「誰であるか（sub）」を出すサービスに留める。

## Consequences

### 良い結果

- ドメインモデル（`Employee`・業務属性）と Use Case を変えずに認証主体だけを移せる。
- ホワイトリストの最終判定が `employees` に一本化され、退職処理は `is_active` 更新で済む。
- 認証は Keycloak、業務属性は nagomi DB、と所有が明確に分かれる。

### 失うもの

- **低摩擦な PIN ログイン UX を失う。**
  ADR-004 の価値は「9桁社員ID + 短い PIN」で素早く入れることだった。
  OIDC リダイレクト + Keycloak のログイン画面は、画面遷移が増え、
  認証情報（パスワード等）の入力体験が PIN より重くなる可能性がある。
  これは標準化・関心分離・SSO 基盤と引き換えに受け入れるトレードオフ。

### 得るもの

- 標準 OIDC への準拠、認証の関心分離、将来の SSO 基盤（ADR-009）。

### 移行上の注意

- 既存ユーザーは、社員IDを Keycloak の username にしてユーザーを作り、
  `employees.auth_user_id` を新しい sub へ更新する（別ステップ）。
- 移行中は `AUTH_PROVIDER` で Supabase 認証へ切り戻せる状態を保つ。

## 関連

- supersedes: ADR-004（擬似メール + PIN ホワイトリスト）
- ADR-009（Keycloak + OIDC + Auth.js の技術選定）
