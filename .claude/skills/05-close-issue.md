# Skill: Issue 完了の確認フロー

このスキルは、Issue の受け入れ条件を確認して閉じるための手順を定義します。

---

## 完了確認の手順

### 1. make verify を実行する

```sh
make verify
```

失敗した場合は自分で修正して再実行してください。
3 回試みても通らない場合は、失敗ログを添えて人間に報告してください。

### 2. 受け入れ条件を一つずつ確認する

Issue ファイルの `## 受け入れ条件` に記載されたチェックリストを順番に確認してください。

```
- [ ] AuthenticateEmployee UseCase が実装されている
- [ ] UseCase が HTTP / DB に依存していない
- [ ] 単体テストが追加されている
- [ ] make verify がエラーを発生させない
```

すべてチェックが入ったことを確認してから次のステップに進んでください。

### 3. Issue ファイルの frontmatter を更新する

Issue ファイル先頭の frontmatter の `status: open` を `status: closed` に変更します。
また `closed_at` に完了日時を記入してください。

```md
---
status: closed
created_at: YYYY-MM-DD
closed_at: YYYY-MM-DD
---
```

### 4. 完了報告を人間に行う

以下の形式で完了報告を行ってください。

```
## 完了報告

Issue: docs/issues/issue-XX-name.md

### 実装した内容
- ...

### 変更したファイル
- src/application/use-cases/AuthenticateEmployee.ts（新規）
- src/application/use-cases/AuthenticateEmployee.test.ts（新規）

### make verify の結果
verify passed.

### 未解決の事項（次 Issue に引き継ぐもの）
- （あれば記載）
```

---

## 注意

- `make verify` が通らない状態で Issue を閉じてはいけません
- 受け入れ条件を一部スキップする場合は、理由を添えて人間に確認を求めてください
- 未解決の事項は必ず次の Issue として切り出すか、Issue 内に TODO として残してください
- ログ系テーブルに触れた場合は、追記のみの制約を守れているか最後に確認してください
