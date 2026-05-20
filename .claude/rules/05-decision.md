<!-- .claude/rules/05-decision.md -->

# Decision Rules

迷った場合は以下の優先順位で判断する:

1. ドメイン仕様（docs/specs）
2. イベントソーシング原則
3. 安全性（データ破壊しない）
4. シンプルさ

## 常に確認すること

- これはイベントとして記録されるべきか？
- Projectionを直接更新していないか？
- Snapshotを壊していないか？
