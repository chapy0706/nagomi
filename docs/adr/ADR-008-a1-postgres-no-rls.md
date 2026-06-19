# ADR-008: A1 Postgres はアプリケーション層で認可を完結させ RLS を設けない

## ステータス

Accepted

## 背景

issue-32 にて、nagomi の DB・ストレージを Supabase から自己ホスト PostgreSQL (A1) と MinIO へ移行する検討を行った。  
Supabase では Row Level Security (RLS) をポリシーとして DB に定義し、`auth.uid()` を利用してリクエスト元ユーザーを自動フィルタリングしている。  
A1 PostgreSQL は Supabase Auth を持たないため、`auth.uid()` コンテキストが存在しない。

## 決定

A1 PostgreSQL 環境では RLS を設けず、認可はアプリケーション層（Use Case / Server Action）のみで担保する。

## 理由

1. **内部ネットワーク限定アクセス**: A1 Postgres は Coolify 内部ネットワークのみに公開し、インターネットから直接到達できない。外部からの認証バイパスリスクが Supabase とは異なる。
2. **`auth.uid()` 依存の除去困難**: Supabase Auth は引き続き別サービスとして動作するが、A1 Postgres に JWT コンテキストを注入する仕組みを設けるとインフラ複雑性が増大する。
3. **セッション単位のトランザクション設定コスト**: `SET LOCAL request.jwt.claims = ...` を全クエリ前に実行するパターンは Drizzle ORM との統合が煩雑で、実装ミスのリスクが高い。
4. **AppLayer で十分**: Use Case 層で `authUserId` と操作対象ユーザー ID の一致チェックを行っており（CLAUDE.md 参照）、Server Action で認証済み `authUserId` を Supabase Auth から取得してから UseCase に渡す設計が徹底されている。

## トレードオフとリスク

- **多層防御の欠如**: RLS がないため、アプリケーションバグ（認可チェックの抜け）が DB 操作に直結する。
- **緩和策**: 
  - ネットワーク境界での隔離（Coolify 内部のみ）
  - Use Case 単位のコードレビューで認可チェックを必須項目とする
  - `authenticated user ≠ 操作対象 user` の混同を CLAUDE.md 禁止事項として明記済み
  - Supabase 環境ではこれまで通り RLS が機能するため、フォールバック可能

## 適用範囲

`DATA_PROVIDER=a1` 環境のみ。`DATA_PROVIDER=supabase`（デフォルト）では従来通り Supabase RLS を使用する。
