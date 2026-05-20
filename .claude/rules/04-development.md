<!-- .claude/rules/04-development.md -->

# Development Rules

- UseCase単位で実装する（Controllerにロジックを書かない）
- Projectionは直接更新しない（必ずイベント経由）
- 副作用（DB書き込み・外部呼び出し）は明示する
- 小さく変更する（1PR = 1責務）
- 命名はドメイン用語に一致させる

## 禁止

- 暗黙の仕様を作る
- 一時的な回避コードを残す
- 型を無視する
