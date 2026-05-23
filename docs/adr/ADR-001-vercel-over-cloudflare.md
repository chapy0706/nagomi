---
status: 承認
date: 2026-05-21
deciders: ちゃぴぃ
---

# ADR-001: デプロイ先に Vercel を選択し、Cloudflare・Railway・Render を不採用とした

## Context

nagomi は Next.js (App Router) をフロントエンドフレームワークとして採用する。
App Router は Server Components・Server Actions・Middleware・Edge Runtime など、
Next.js 固有の実行モデルに依存する機能を多用する構成になる。

同時に、Supabase Realtime を用いたリアルタイム presence 同期、および Jitsi の iframe 埋め込みが
コアな要件として存在する。デプロイ先の選定には、これらの動作保証と、
「無料枠で50人規模を安定して運用できるか」という制約が重なる。

開発の初期段階では、設定や制約の調査に割くコストを最小化し、
プロダクトの設計と実装に集中したい、という優先順位もある。

## Decision

デプロイ先として **Vercel** を採用する。

Next.js のホスティングは Vercel、永続化・認証・リアルタイムは Supabase、という2サービス構成とする。
Cloudflare・Railway・Render は本 ADR の検討時点で不採用とする。

## Rationale

### Vercel を選んだ理由

**Next.js との公式な一致。**
Vercel は Next.js の開発元であり、App Router・Server Actions・Middleware・Image Optimization
といった機能が追加設定なしで動作する。サードパーティのホスティングでは
「Next.js は動くが、この機能は制約あり」という調査コストが常について回る。
nagomi の構成は App Router の機能を広く使うため、この一致は大きい。

**WebSocket(Realtime)との親和性。**
Supabase Realtime は WebSocket ベースだが、接続の実体は Supabase 側にある。
Vercel の関数は短命なサーバレス実行だが、nagomi のリアルタイム通信は
「Vercel 上で WebSocket を維持する」のではなく「クライアントが直接 Supabase に接続する」
構成をとる。したがって Vercel のサーバレス制約はリアルタイム通信の障害にならない。

**無料枠の実用性。**
Vercel の Hobby プランは、個人・小規模プロジェクト向けに十分な無料枠を提供する。
50人規模の同時接続においても、重い計算をサーバ側に持たせない
nagomi のアーキテクチャであれば、Hobby プランの枠内で運用できる見込みが高い。

**Preview 環境の自動生成。**
PR ごとに Preview URL が自動で発行される。設計の確認や動作検証を
本番環境を汚さずに行えることは、issue 駆動開発との相性がいい。

### Cloudflare を不採用とした理由

Cloudflare Pages / Workers は Edge ランタイムで動作する。
Edge ランタイムは Node.js の完全な API セットを持たず、
Next.js の一部機能（特に Node.js API に依存するもの）が動作しないか、
追加の設定・対応が必要になる。

nagomi の開発初期段階では「どこまでが Edge ランタイムの制約か」を調査しながら
実装を進めるコストを払う余裕がない。将来的に CDN 活用やコスト最適化の観点で
Cloudflare を再検討する余地は残すが、現時点では採用しない。

### Railway を不採用とした理由

Railway は無料枠の制限が nagomi の運用イメージと合わなかった。
具体的には、月あたりの実行時間・スリープの挙動などが、
「業務終わりや休日にふらっとログインできる」という常時起動を前提とする
nagomi のユースケースに対して不確実性が高い。

### Render を不採用とした理由

Render の無料プランは、非アクティブ状態が続くとインスタンスがスリープし、
次のリクエスト時に起動に数十秒かかるコールドスタートが発生する。
nagomi はユーザーが「ふらっと立ち寄る」場所を志向しており、
ログイン時に数十秒の待機が発生する体験は、来訪のハードルを直接上げる。
無料枠を維持しながらコールドスタートを避けるチューニングコストも見合わない。

## Consequences

### 良い結果

- Next.js の機能をフルに使える。追加調査なしに App Router の恩恵を受けられる
- PR ごとの Preview 環境で、issue 単位の動作確認が本番を汚さずできる
- Supabase との組み合わせで、インフラ運用の複雑さを最小化できる

### 引き受けるトレードオフ

- Vercel の無料枠（Hobby プラン）の制約に縛られる。将来的に利用が増えた場合、
  有料プランへの移行か、別ホスティングへの移行判断が発生しうる
- Vercel への依存度が高い。Next.js のデプロイ先を変更する場合、
  Preview 環境・環境変数管理・ビルド設定を含めて移行コストが発生する
- Cloudflare の CDN・Edge 機能（画像最適化、DDoS 対策など）は現時点では使えない

### 今後の見直し条件

以下のいずれかが発生した場合、本 ADR を見直す。

- Vercel の無料枠が nagomi の利用規模に対して不足するようになった
- Edge ランタイムへの移行が、パフォーマンス上の明確な要件として浮上した
- Cloudflare の制約が解消され、Next.js との親和性が十分に担保されるようになった
