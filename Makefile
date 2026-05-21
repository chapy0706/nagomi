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
	@echo "  db/start       ローカル Supabase 起動"
	@echo "  db/stop        ローカル Supabase 停止"
	@echo "  db/up          マイグレーション適用（ローカル）"
	@echo "  db/reset       ローカル DB リセット（全マイグレーション + seed 再適用）"
	@echo "  db/new name=X  マイグレーションファイル新規作成"
	@echo "  db/seed        seed データ投入（db/reset と同等）"
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
		echo "supabase CLI が見つかりません。pnpm 経由（pnpm supabase）で利用するか、インストールしてください: https://supabase.com/docs/guides/cli"; \
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
	pnpm vitest run --project integration

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
# DB Migration（Supabase）
# ------------------------

.PHONY: db/start
db/start:
	pnpm supabase start

.PHONY: db/stop
db/stop:
	pnpm supabase stop

.PHONY: db/up
db/up:
	pnpm supabase migration up

.PHONY: db/reset
db/reset:
	@echo "警告: ローカル DB を全リセットします（全マイグレーション + seed を再適用）。続行しますか？ [y/N]" && read ans && [ "$${ans}" = "y" ]
	pnpm supabase db reset

.PHONY: db/new
db/new:
	@if [ -z "$(name)" ]; then echo "使い方: make db/new name=migration_name" && exit 1; fi
	pnpm supabase migration new $(name)

.PHONY: db/seed
db/seed:
	@echo "seed は supabase/seed.sql を db/reset 時に適用します。"
	$(MAKE) db/reset

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
