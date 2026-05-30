SHELL := /bin/bash

.PHONY: help
help:
	@echo ""
	@echo "nagomi Makefile"
	@echo ""
	@echo "  setup          初期セットアップ（依存インストール）"
	@echo "  setup/e2e      Playwright ブラウザのインストール"
	@echo "  dev            開発サーバー起動（Next.js）"
	@echo ""
	@echo "  test           全テスト実行（Vitest）"
	@echo "  test/unit      単体テストのみ"
	@echo "  test/integ     統合テストのみ（ローカル Supabase）"
	@echo "  test/e2e       E2Eテスト（Playwright）"
	@echo ""
	@echo "  lint           静的解析（Biome）"
	@echo "  fmt            フォーマット適用（Biome）"
	@echo "  type-check     型チェック（tsc --noEmit）"
	@echo ""
	@echo "  db/push        本番環境にマイグレーション適用"
	@echo "  db/new name=X  マイグレーションファイル新規作成"
	@echo "  db/reset       ローカル DB をリセット（migration + seed 再適用）"
	@echo "  db/seed-dev    テストアカウントを hosted Supabase に作成（.env.local 必要）"
	@echo ""
	@echo "  verify         全チェック（lint + type-check + test）"
	@echo "  evidence       verify + カバレッジ出力"
	@echo ""
	@echo "  issue/list     docs/issues 配下の未完了 Issue を表示"
	@echo "  issue/new      Issue テンプレートを作成"
	@echo ""

# ------------------------
# Setup
# ------------------------

.PHONY: setup
setup:
	pnpm install --frozen-lockfile
	@if ! command -v supabase >/dev/null 2>&1; then \
		echo "supabase CLI が見つかりません。brew install supabase/tap/supabase でインストールしてください: https://supabase.com/docs/guides/cli"; \
	fi

.PHONY: setup/e2e
setup/e2e:
	pnpm exec playwright install --with-deps chromium

# ------------------------
# Run
# ------------------------

.PHONY: dev
dev:
	pnpm dev

# ------------------------
# Test
# ------------------------

.PHONY: test
test:
	pnpm vitest run

.PHONY: test/unit
test/unit:
	pnpm vitest run --project unit

.PHONY: test/integ
test/integ:
	pnpm vitest run tests/integration

.PHONY: test/e2e
test/e2e:
	pnpm playwright test

# ------------------------
# Lint / Format / Type
# ------------------------

.PHONY: lint
lint:
	pnpm biome check .

.PHONY: fmt
fmt:
	pnpm biome check --write .

.PHONY: type-check
type-check:
	pnpm tsc --noEmit

# ------------------------
# DB Migration / Seed
# ------------------------

.PHONY: db/push
db/push:
	supabase db push

.PHONY: db/new
db/new:
	@if [ -z "$(name)" ]; then echo "使い方: make db/new name=migration_name" && exit 1; fi
	supabase migration new $(name)

.PHONY: db/reset
db/reset:
	supabase db reset

.PHONY: db/seed-dev
db/seed-dev:
	@if [ ! -f .env.local ]; then echo "エラー: .env.local が見つかりません" && exit 1; fi
	node --env-file=.env.local scripts/seed-dev-account.mjs


# ------------------------
# Verify（重要: Claude Code はこれを必ず通すこと）
# ------------------------

.PHONY: verify
verify: lint type-check test
	@echo ""
	@echo "verify passed."

.PHONY: evidence
evidence:
	@mkdir -p tmp/evidence
	pnpm vitest run --coverage 2>&1 | tee tmp/evidence/test.log
	pnpm tsc --noEmit 2>&1 | tee tmp/evidence/type-check.log
	pnpm biome check . 2>&1 | tee tmp/evidence/lint.log
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
	@if [ -z "$(name)" ]; then echo "使い方: make issue/new name=issue-XX-issue-name" && exit 1; fi
	@if [ -f "docs/issues/$(name).md" ]; then echo "すでに存在します: docs/issues/$(name).md" && exit 1; fi
	cp docs/issues/_template.md docs/issues/$(name).md
	@echo "作成しました: docs/issues/$(name).md"
