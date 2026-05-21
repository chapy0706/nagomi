# CLAUDE.md

このリポジトリ（nagomi）では、Claude Code を設計補助・実装補助として使用します。

## nagomi について

- 名称: nagomi（和み）。協調と平等、ゆるやかな居場所性を体現する
- 目的: 派遣社員のための 2D 仮想オフィス。業務終わりや休日にふらっと立ち寄れる場所を提供し、孤立感と短期離職の低減に寄与する
- 詳細仕様: README.md / docs/issues/*.md / docs/adr/*.md を参照

## 基本方針

Claude Code は実装者ではなく、設計意図を守る共同作業者として扱います。

実装前に必ず以下を確認してください。

1. README.md
2. 着手対象の docs/issues/*.md（status: open のもの）
3. docs/adr/*.md
4. .claude/rules/*.md
5. 既存のディレクトリ構成
6. make verify の結果

## 作業ルール

- 仕様が曖昧なまま実装しない
- Issue に記載のない設計判断が必要になったら、実装を止めて人間に確認する
- Domain / Application / Infrastructure / Presentation の依存方向を崩さない
- Domain 層に HTTP・DB・認証・環境変数・フレームワークを持ち込まない
- Application 層に SQL を書かない
- Infrastructure 層・Presentation 層に業務判断を書かない
- 時刻は直接 new Date() を呼ばず、Clock ポート経由にする
- 境界（外部入力）では unknown を Zod で parse してから扱う
- DB 更新はトランザクション境界を明示する
- 認証済みユーザー ID と操作対象ユーザー ID を混同しない

## ログテーブルの扱い（重要）

attendance_logs / call_participation_logs / reports / satisfaction_responses などのログ系テーブルは追記のみ（append-only）として扱います。

- アプリケーションコードから UPDATE・DELETE を行わない（記録の信頼性のため）
- logged_out_at / left_at のような「後から確定する終了時刻」だけは例外的に更新を許すが、それ以外の列は書き換えない
- ログの物理削除は運用バッチ（pg_cron）のみが行う
- reports・satisfaction_responses に個人を特定する情報を追加しない

## TypeScript 実装ルール

- any は原則禁止。必要なら unknown を経由して narrow する
- 型定義は type を優先する
- 値オブジェクトはクラスで実装し、不変条件をコンストラクタで担保する
- null と undefined を混在させない（undefined を優先）
- 副作用のある関数は名前で明示する（fetch / save / send / record など）
- グローバル可変状態を避ける
- 例外を握りつぶさない。エラーには文脈を付ける
- 純粋関数を優先する

## テスト方針

- Domain は単体テスト中心（Vitest）
- Application はポートの fake / mock でテストする
- Infrastructure はローカル Supabase を使った統合テスト
- Presentation は主要コンポーネントのテストを用意する
- 重要なユーザーフローは Playwright で E2E を用意する

## 完了条件

原則として、変更後は以下が通ること。

```sh
make verify
```

証跡が必要な場合は以下も実行すること。

```sh
make evidence
```

## Claude Code への期待

- 実装前に影響範囲を説明する（安全性 / 変更容易性 / 性能 / 運用 の観点で）
- ファイル変更理由を明確にする
- セキュリティ・認証・DB 更新・プライバシーのリスクを指摘する
- 不明点は実装を止めて確認するか、Issue に TODO として残す
- 不要な抽象化を増やさない
