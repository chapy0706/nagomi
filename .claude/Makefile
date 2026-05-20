SHELL := /bin/bash

.PHONY: help
help:
	@echo ""
	@echo "go-attendance Makefile"
	@echo ""
	@echo "  setup          初期セットアップ"
	@echo "  run            APIサーバー起動"
	@echo "  run/batch      バッチ処理起動"
	@echo ""
	@echo "  test           全テスト実行"
	@echo "  test/unit      単体テストのみ"
	@echo "  test/integ     統合テストのみ（Testcontainers）"
	@echo "  test/e2e       E2Eテスト（Playwright）"
	@echo ""
	@echo "  lint           静的解析"
	@echo "  fmt            フォーマット"
	@echo "  sqlc           sqlc コード生成"
	@echo ""
	@echo "  db/up          マイグレーション適用"
	@echo "  db/down        マイグレーション1件戻す"
	@echo "  db/reset       マイグレーション全リセット"
	@echo "  db/new name=X  マイグレーションファイル新規作成"
	@echo ""
	@echo "  verify         全チェック（lint + test）"
	@echo "  evidence       verify + カバレッジ出力"
	@echo ""
	@echo "  issue/list     docs/issues 配下の未完了Issueを表示"
	@echo "  issue/new      Issueテンプレートを作成"
	@echo ""

# ------------------------
# Setup
# ------------------------

.PHONY: setup
setup:
	go mod tidy
	@if ! command -v sqlc >/dev/null 2>&1; then \
		echo "sqlc が見つかりません。インストールしてください: go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest"; \
	fi
	@if ! command -v golangci-lint >/dev/null 2>&1; then \
		echo "golangci-lint が見つかりません: https://golangci-lint.run/usage/install/"; \
	fi

# ------------------------
# Run
# ------------------------

.PHONY: run
run:
	go run ./apps/api/cmd/app

.PHONY: run/batch
run/batch:
	go run ./apps/api/cmd/batch

# ------------------------
# Test
# ------------------------

.PHONY: test
test:
	go test ./... -v -count=1

.PHONY: test/unit
test/unit:
	go test ./... -v -count=1 -short

.PHONY: test/integ
test/integ:
	go test ./... -v -count=1 -run Integration

.PHONY: test/e2e
test/e2e:
	cd e2e && pnpm exec playwright test

# ------------------------
# Lint / Format
# ------------------------

.PHONY: lint
lint:
	go vet ./...
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "golangci-lint が見つからないため go vet のみ実行しました"; \
	fi

.PHONY: fmt
fmt:
	gofmt -w .
	goimports -w . 2>/dev/null || true

# ------------------------
# sqlc
# ------------------------

.PHONY: sqlc
sqlc:
	sqlc generate

# ------------------------
# DB Migration
# ------------------------

.PHONY: db/up
db/up:
	@if command -v goose >/dev/null 2>&1; then \
		goose -dir db/migrations postgres "$$DATABASE_URL" up; \
	else \
		go run -mod=mod github.com/pressly/goose/v3/cmd/goose@latest \
			-dir db/migrations postgres "$$DATABASE_URL" up; \
	fi

.PHONY: db/down
db/down:
	@if command -v goose >/dev/null 2>&1; then \
		goose -dir db/migrations postgres "$$DATABASE_URL" down; \
	else \
		go run -mod=mod github.com/pressly/goose/v3/cmd/goose@latest \
			-dir db/migrations postgres "$$DATABASE_URL" down; \
	fi

.PHONY: db/reset
db/reset:
	@echo "警告: 全マイグレーションをリセットします。続行しますか？ [y/N]" && read ans && [ "$${ans}" = "y" ]
	@if command -v goose >/dev/null 2>&1; then \
		goose -dir db/migrations postgres "$$DATABASE_URL" reset; \
	else \
		go run -mod=mod github.com/pressly/goose/v3/cmd/goose@latest \
			-dir db/migrations postgres "$$DATABASE_URL" reset; \
	fi

.PHONY: db/new
db/new:
	@if [ -z "$(name)" ]; then echo "使い方: make db/new name=migration_name" && exit 1; fi
	@if command -v goose >/dev/null 2>&1; then \
		goose -dir db/migrations create $(name) sql; \
	else \
		go run -mod=mod github.com/pressly/goose/v3/cmd/goose@latest \
			-dir db/migrations create $(name) sql; \
	fi

# ------------------------
# Verify（重要: Claude Code はこれを必ず通すこと）
# ------------------------

.PHONY: verify
verify: fmt lint test
	@echo ""
	@echo "verify passed."

.PHONY: evidence
evidence:
	@mkdir -p tmp/evidence
	go test ./... -v -count=1 -coverprofile=tmp/evidence/coverage.out 2>&1 | tee tmp/evidence/test.log
	go tool cover -html=tmp/evidence/coverage.out -o tmp/evidence/coverage.html
	go vet ./... 2>&1 | tee tmp/evidence/vet.log
	@echo ""
	@echo "evidence saved to tmp/evidence/"

# ------------------------
# Issue 管理
# ------------------------

.PHONY: issue/list
issue/list:
	@echo ""
	@echo "未完了 Issue 一覧 (docs/issues/):"
	@echo ""
	@if ls docs/issues/*.md >/dev/null 2>&1; then \
		grep -l "status: open" docs/issues/*.md 2>/dev/null \
			| xargs -I{} sh -c 'echo "  $$(basename {}): $$(grep "^# " {} | head -1 | sed "s/^# //")"' \
			|| echo "  （未完了の Issue はありません）"; \
	else \
		echo "  （docs/issues/ に Issue ファイルがありません）"; \
	fi
	@echo ""

.PHONY: issue/new
issue/new:
	@if [ -z "$(name)" ]; then echo "使い方: make issue/new name=0001-issue-name" && exit 1; fi
	@if [ -f "docs/issues/$(name).md" ]; then echo "すでに存在します: docs/issues/$(name).md" && exit 1; fi
	cp docs/issues/_template.md docs/issues/$(name).md
	@echo "作成しました: docs/issues/$(name).md"
