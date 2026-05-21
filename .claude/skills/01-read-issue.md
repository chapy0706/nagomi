# Skill: Issue の読み方・着手フロー

このスキルは、`docs/issues/` 配下の Issue ファイルを起点に作業を開始するための手順を定義します。

---

## 手順

### 1. Issue ファイルを読む

指定された Issue ファイルを読み、以下を把握してください。

- frontmatter の `status` : `open` のもののみ着手対象
- `## 概要・背景・目的` : 何をなぜするのか
- `## 受け入れ条件` : 何をもって完了とするか（チェックリスト）
- `## 技術的な検討事項` : 実装上の注意点
- `## 関連ADR・依存issue` : 参照すべき ADR と、先に完了が必要な Issue
- `## 想定工数・優先度`

### 2. 関連 ADR と依存 Issue を確認する

`## 関連ADR・依存issue` に記載された ADR（`docs/adr/`）を必ず読んでください。
読まずに実装を始めてはいけません。

依存 Issue が `status: open` のままなら、着手前に人間へ確認してください。

### 3. 既存コードを確認する

変更対象の層に既存実装がある場合は、先に読んでから作業を始めてください。
以下のコマンドで絞り込んでから読むこと。

```sh
rg "対象の関数名・型名" src/
tree src/
```

### 4. 影響範囲と変更計画を説明する

着手前に、以下を人間に説明して承認を得てください。

- 変更するファイル一覧
- 変更する理由
- テスト追加の方針
- `make verify` への影響

承認なしに実装を開始しないこと。

### 5. 該当スキルを読む

実装に入る前に `.claude/skills/` から該当スキルを読んでください。

| 実装内容 | 読むスキル |
|---|---|
| UseCase を新規作成する | 02-implement-usecase.md |
| Adapter（Gateway / Repository 実装）を作成する | 03-implement-adapter.md |
| Route Handler / Server Action を追加する | 04-implement-handler.md |
| Issue を閉じる | 05-close-issue.md |

---

## 注意

- `status: open` の Issue のみ着手対象です
- `status: closed` の Issue は変更しません
- Issue に記載のない設計判断が必要になった場合は実装を止め、人間に確認してください
- ログ系テーブルに触れる Issue では、追記のみ（append-only）の制約を必ず守ること
