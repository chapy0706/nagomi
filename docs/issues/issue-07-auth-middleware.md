---
status: open
created_at: 2026-05-21
closed_at:
---

# issue-07: 認証ミドルウェアとセッション管理

## 概要・背景・目的

Next.js App Router の認証境界を一箇所に集約し、保護ルートと公開ルートを明確に分離する。
Server Component で session を取得し、Client Component に必要最小限の情報のみを渡す設計とする。

ミドルウェアでの認証チェックを徹底することで、認可漏れによる情報漏洩を構造的に防ぐ。
RLSと併せて多層防御（defense in depth）を成立させる。

## 受け入れ条件

- [ ] `middleware.ts` で未認証ユーザーをログイン画面にリダイレクトする
- [ ] 公開ルート（ログイン画面・プライバシーポリシー）が明示的にホワイトリスト化されている
- [ ] Server Component で session を取得するヘルパーが実装されている
- [ ] Client Component に渡す user 情報は最小化されている（PINやemailは渡さない）
- [ ] ログアウト機能が実装されている（Cookie削除 + Supabase session 破棄）
- [ ] セッション有効期限切れ時の自動ログアウト挙動が実装されている
- [ ] `is_active = false` になったユーザーは次回リクエストでログアウトされる
- [ ] E2E テストでログイン→保護ルート→ログアウトの一連が動作する
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- Cookie 設定は httpOnly + secure + sameSite=lax を必須とする
- Supabase の `@supabase/ssr` パッケージを利用する
- Middleware のマッチャー設定で静的アセットを除外し、無駄な処理を避ける
- セッション情報のキャッシュ戦略を Server Component 単位で適切に設定する
- ログアウト時には presence からも明示的に離脱させる（in_call 状態を引きずらない）

## 関連ADR・依存issue

- 関連ADR: なし
- 依存: issue-05、issue-06
- 後続: 認証が前提となる全てのissue

## 想定工数・優先度

- 工数: 半日〜1日
- 優先度: 最高
