# CLAUDE.md

このファイルは Claude Code がリポジトリで作業する際に参照する規約集。
セッションの開始時に必ず読み込まれることを前提に記述している。

## プロジェクト概要

- 名称: nagomi
- 由来: 「和み」。協調と平等、ゆるやかな居場所性を体現する
- 目的: 派遣社員のための2D仮想オフィス。業務終わりや休日にふらっと立ち寄れる場所を提供し、孤立感と短期離職の低減に寄与する
- 詳細仕様: README.md を参照
- 設計判断の記録: docs/adr/ を参照

## 基本原則

### プロダクトの倫理を機能で担保する

「運用ルールで担保します」ではなく、データモデルとコードで物理的に成立する設計を選ぶ。
- 通報者IDは保存しない（匿名性をスキーマで保証）
- 管理者でも個人別の利用ログを参照できない（集計ビュー経由のみ）
- RLSで認可をDB層に集約

### 過剰な複雑化を避ける

Clean Architecture を採用するが、教科書通りの4層ではなく3層構成にまとめている。
新しい抽象を追加する前に、本当に必要かを問う。

- 既存の抽象で表現できるなら、新しい抽象を作らない
- インターフェースは複数の実装が想定される時にのみ作る
- 「将来必要になるかも」だけで設計しない（YAGNI）

### 依存方向を守る

依存は常に内側に向かう。外側の事情がドメインに漏れない。

```
presentation -> application -> domain
                                  ^
                                  |
              infrastructure -----+
```

- domain は他のどの層にも依存しない（純粋な TypeScript のみ）
- application は domain と ports にのみ依存する
- infrastructure は ports を実装する（domain への依存はOK）
- presentation は application と domain を利用する

この方向を破る import が必要に感じた時は、設計の見直しが必要なサイン。

### UNIX哲学

- ひとつのモジュールはひとつのことだけ責任を持つ
- 各ゲートウェイ（Auth / Presence / Video）は互いを知らない
- 観測しやすい単位で機能を切る

## 技術スタック

| 項目 | 採用 |
|---|---|
| ランタイム | Node.js 20以上 |
| 言語 | TypeScript（strict有効） |
| フレームワーク | Next.js (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| 認証 | Supabase Auth |
| DB | Supabase Postgres + RLS |
| リアルタイム | Supabase Realtime |
| 通話 | Jitsi Meet (meet.jit.si) |
| パッケージ管理 | pnpm（npm/yarn は使わない） |
| Lint/Format | Biome |
| ユニットテスト | Vitest |
| E2Eテスト | Playwright |
| デプロイ | Vercel + Supabase |

## ディレクトリ構成

```
src/
  domain/                # ビジネスルールの中心。フレームワーク非依存
    entities/
    value-objects/
    services/
    ports/               # 外界とのインターフェース（抽象）
  application/           # ユースケース
    use-cases/
  infrastructure/        # ポートの具象実装
    supabase/
    jitsi/
    config/
  presentation/          # Next.js の世界
    app/
    components/
    hooks/
    lib/

tests/
  unit/                  # Vitest
  integration/           # Vitest + Supabase Local
  e2e/                   # Playwright

supabase/
  migrations/
  seed.sql
  config.toml

docs/
  adr/                   # Architecture Decision Records
  diagrams/
```

## コマンド

主要な操作は Makefile に集約されている。Claude Code が作業する際は make コマンドを優先する。
直接 pnpm を叩く場合は package.json の scripts を参照。

代表的な操作（Makefile に定義されている前提）:

```bash
make dev              # 開発サーバ起動
make build            # 本番ビルド
make test             # Vitestユニットテスト
make test-e2e         # Playwright E2Eテスト
make lint             # Biome lint
make format           # Biome format
make db-migrate       # Supabaseマイグレーション適用
make db-seed          # 初期データ投入
make db-reset         # ローカルDBリセット
```

Makefile が見つからない場合や対応するターゲットがない場合は、pnpm scripts の確認を Claude から提案すること。勝手に Makefile を変更しない。

## コーディング規約

### 命名

- ファイル名: PascalCase（クラス・コンポーネント）または kebab-case（その他）
- ディレクトリ名: kebab-case
- 型・クラス・コンポーネント: PascalCase
- 変数・関数: camelCase
- 定数: SCREAMING_SNAKE_CASE
- ドメインの語彙は日本語の概念を英語名にマッピングしたものを使う（例: 和み=nagomi, 招待=Invitation）

### TypeScript

- `any` は原則禁止。必要なら `unknown` を経由して narrow する
- 型定義は interface より type を優先（合成のしやすさ）
- 値オブジェクトはクラスで実装し、不変条件をコンストラクタで担保
- null と undefined を混在させない（プロジェクト全体で undefined を優先）

### 関数

- 純粋関数を優先する
- 副作用がある関数は名前で明示する（fetch, save, send, record など）
- 早期 return を活用してネストを浅く保つ

### コンポーネント

- Server Component を優先、Client Component は必要な場合のみ
- Client Component には `'use client'` を明示
- Props は type で定義し、デフォルト値はパラメータで指定

### Tailwind / shadcn

- インラインで Tailwind ユーティリティを書く
- 共通スタイルは shadcn のコンポーネント側で吸収する
- 色は設計トークン経由で参照（status-available, status-busy など）
- カスタムCSSは原則書かない（必要な時は globals.css に集約）

## テスト方針

### Vitest（ユニット・統合）

- domain 層: カバレッジ80%以上を目標
- application 層: ゲートウェイをモック化してユースケースの順序と分岐を検証
- infrastructure 層: Supabase Local を使った統合テスト
- スナップショットテストは原則使わない（壊れやすく意図が伝わりにくい）
- テストファイルは対象ファイルと同階層に `*.test.ts` で配置

### Playwright（E2E）

- 主要シナリオ5〜7本に絞る
- モバイルビューポートでの確認も含める
- Jitsi接続部分はモックで代替（CI安定性のため）

### テスト駆動

- バグ修正時はまず再現テストを書く
- 新機能実装時はユースケース層から書き始める

## コミットとブランチ

### コミットメッセージ

Conventional Commits 形式を採用。

```
<type>(<scope>): <subject>

<body>
```

- type: feat, fix, refactor, test, docs, chore, style
- scope: domain, application, infrastructure, presentation, infra など
- 日本語でのコミットメッセージも可（チーム判断）

### ブランチ命名

- main: 本番
- develop: 開発統合
- feature/<scope>-<short-name>: 機能開発
- fix/<scope>-<short-name>: バグ修正

## やってほしいこと

- 実装前に「依存方向は守れているか」「既存の抽象で表現できないか」を確認する
- ドメイン層のコードを書く時は、フレームワークの存在を一度忘れる
- 新しい外部依存（npm package）を追加する前に、本当に必要か検討する
- 設計判断を行った場合、docs/adr/ に ADR を1本書くことを提案する
- 不明な点・複数の選択肢がある場合は、勝手に決めず確認を求める

## やってはいけないこと

- npm や yarn を使う（pnpm 固定）
- Makefile を勝手に書き換える（過去作から継承している前提）
- GitHub Actions の .yml を勝手に書き換える（過去作から継承している前提）
- `any` を理由なく使う
- domain 層から infrastructure や presentation を import する
- 環境変数を `.env` ではなくコードに直書きする
- `SUPABASE_SERVICE_ROLE_KEY` をクライアント側コードで参照する
- 通報者・満足度回答に紐づく個人特定情報をスキーマに追加する
- マイグレーションを手動でDBに当てる（必ず supabase/migrations 経由）
- ドキュメントや README に絵文字を入れる（プロジェクト全体で絵文字なしで統一）

## コミュニケーション

- 基本的な対話は日本語
- 設計判断について議論する際は、トレードオフを言語化することを優先する
- 「なぜそうするか」が説明できない実装は提案しない
- 過去のチャットや作業経緯に依存しない記述を心がける（CLAUDE.md は単独で読まれる前提）

## 参照すべきドキュメント

- README.md: プロダクト全体像と仕様
- docs/adr/: 主要な設計判断の記録
- docs/diagrams/: アーキテクチャ図・シーケンス図
- supabase/migrations/: DBスキーマの歴史
