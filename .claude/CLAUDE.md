# CLAUDE.md

このリポジトリでは、Claude Codeを設計補助・実装補助として使用します。

## 基本方針

Claude Codeは実装者ではなく、設計意図を守る共同作業者として扱います。

実装前に必ず以下を確認してください。

1. README.md
2. docs/specs/active/*.md
3. docs/adr/*.md
4. 既存のディレクトリ構成
5. make verify の結果

## 作業ルール

- 仕様が曖昧なまま実装しない
- 大きな変更は docs/specs/active にSpecを作成してから行う
- Domain / UseCase / Port / Adapter の依存方向を崩さない
- Domain層にHTTP・DB・認証・環境変数を持ち込まない
- UseCase層にSQLを書かない
- Adapter層に業務判断を書かない
- 時刻は直接 time.Now() を呼ばず、Clock interface 経由にする
- DB更新はトランザクション境界を明示する
- 認証済みユーザーIDと操作対象ユーザーIDを混同しない

## Go実装ルール

- packageは小さく保つ
- interfaceは利用側に置く
- エラーは握りつぶさない
- context.Context を外部境界から渡す
- グローバル状態を避ける
- panicは起動時の設定不備など、復旧不能な場面に限定する
- sqlc生成コードは手で編集しない

## テスト方針

- Domainは単体テスト中心
- UseCaseはRepository mockまたはfakeでテスト
- RepositoryはTestcontainersでPostgreSQL統合テスト
- APIはhandler単位のテストを用意
- 重要なユーザーフローはPlaywrightでE2Eを用意

## 完了条件

原則として、変更後は以下が通ること。

```sh
make verify
```

証跡が必要な場合は以下も実行すること。

```sh
make evidence
```

## Claude Codeへの期待

- 実装前に影響範囲を説明する
- ファイル変更理由を明確にする
- セキュリティ・認証・DB更新のリスクを指摘する
- 不明点はSpecにTODOとして残す
- 不要な抽象化を増やさない
