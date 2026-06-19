# Claude Code への指示書: nagomi 本体の DB・Storage 移行（issue-32）

この指示書は issue-32 を Claude Code と並走して進めるためのもの。Supabase 依存（DB・Storage）を A1 へ移す。認証方式は変えない（issue-33 で扱う）。段階ごとに区切り、各段階で動作確認を挟む。

---

## 前提の共有（最初に Claude Code に伝える文脈）

```
nagomi 本体（Next.js）の Supabase 依存を A1 へ移します。

スコープ:
- DB を A1 PostgreSQL に移す（Drizzle で作り直す）
- Storage を MinIO（S3互換）に移す
- 認証方式は変えない（ホワイトリスト+PIN のまま、データだけ A1 へ）
- Realtime は移行済み（nagomi-ws）

アーキテクチャ上の絶対制約:
- src/domain/ は一切変更しない
- src/domain/ports/ のインターフェースは変更しない
- 新実装は src/infrastructure/postgres/ と src/infrastructure/minio/ に置く
- 既存の src/infrastructure/supabase/ は削除せず残す（切り戻し可能にする）
- 環境変数で Supabase 実装と A1 実装を切り替えられるようにする

各ステップで以下を守ってください:
1. 何をするか・なぜそうするかを先に説明する
2. 一度に大量のコードを出さず、一つの責務ごとに区切る
3. 各ステップの最後に動作確認の方法を示す
4. 詰まったら区間で切り分ける
```

---

## デプロイ時の既知の落とし穴（nagomi-ws で踏んだもの・先に伝える）

```
nagomi-ws のデプロイで以下にハマったので、nagomi 本体でも先回りで回避したい:

1. Coolify の自動生成 Traefik ラベルが Host(``) と空になり壊れる
   → Traefik 動的設定ファイル（/data/coolify/proxy/dynamic/）で直接ルートを書く

2. Cloudflare Universal SSL は1段サブドメインのみ
   → nagomi.chapy0706.com のように1段にする（2段は SSL 失敗）

3. コンテナ内サービスは 0.0.0.0 で listen しないと Traefik から届かない
   → Next.js の start も 0.0.0.0 で待ち受ける

4. Dockerfile 直接指定より Docker Compose で build する方が安定

5. 設定ファイルはリッチエディタ（Obsidian等）で編集しない（スマートクォート事故）
```

---

## ステップ1: A1 PostgreSQL に nagomi-db を作る

これは Coolify の操作なので、手順を案内してもらう。

```
Coolify の portfolios プロジェクトに nagomi 用 PostgreSQL を立てたいです。
- Coolify の New Resource → PostgreSQL の設定値（ユーザー・DB名・パスワード）を案内してください
- 接続情報（DATABASE_URL）の形式を示してください
- コンテナ名での内部接続（nagomi-db:5432）になる点を確認してください
```

確認ポイント: PostgreSQL コンテナが Running になること。

---

## ステップ2: Drizzle でスキーマを定義し直す

```
既存の supabase/migrations/ にある SQL を、Drizzle スキーマとして再定義したいです。

- supabase/migrations/ の SQL を読んで、テーブル構造を把握してください
- それを Drizzle のスキーマ定義（schema.ts）に移植してください
- 一度に全部ではなく、テーブルごとに区切って進めてください
- RLS に依存している箇所があれば指摘してください
  （A1 で RLS を使うかアプリ層で制御するかは別途判断する）

まず既存スキーマの全体像を説明してから、移植方針を提案してください。
```

確認ポイント: drizzle-kit で migrate が通り、A1 PostgreSQL にテーブルができること。

---

## ステップ3: RLS の扱いを決める

```
nagomi は Supabase の RLS（行レベルセキュリティ）に依存している箇所があります
（employees-rls.test.ts が存在）。

A1 PostgreSQL では RLS をどう扱うべきか、選択肢と推奨を示してください:
- A1 PostgreSQL でも RLS を使う
- アプリ層（ドメイン/アプリケーション層）で制御する

それぞれのトレードオフを説明し、Clean Architecture の観点での推奨を出してください。
この判断は ADR に残したいので、決定理由を明記してください。
```

確認ポイント: RLS の方針が決まり、ADR の下書きができること。

---

## ステップ4: MinIO を立てて StorageGateway を差し替える

```
Storage を Supabase Storage から MinIO（S3互換）に移したいです。

- MinIO を Coolify に立てる手順を案内してください
- 既存の SupabaseStorageGateway の実装を読んで、使っている操作（put/get/delete等）を把握してください
- src/infrastructure/minio/MinioStorageGateway.ts を実装してください
- StorageGateway インターフェースは変更しないでください
- MinIO は S3 互換なので AWS SDK か minio クライアントで繋ぎます

まず既存の SupabaseStorageGateway が何をしているかを説明してから実装してください。
```

確認ポイント: アバター画像のアップロード・取得が MinIO 経由で動くこと。

---

## ステップ5: 各 Gateway の接続先を A1 へ差し替える

```
DB を使う各 Gateway（AttendanceRepository, EmployeeRepository 等）の
PostgreSQL 実装を src/infrastructure/postgres/ に作りたいです。

- 既存の Supabase 実装と同じインターフェースを満たす
- Drizzle 経由で A1 PostgreSQL に接続する
- 一度に全部ではなく、Gateway ごとに区切って進める
- 認証関連（AuthGateway）はホワイトリスト+PIN の方式を維持したまま
  データソースだけ A1 PostgreSQL に向ける

どの Gateway から着手するか、依存関係の少ないものから順序を提案してください。
```

確認ポイント: 各 Gateway が A1 PostgreSQL に対して動くこと。

---

## ステップ6: 切り替え機構

```
Supabase 実装と A1 実装を環境変数で切り替えられるようにしたいです。

- DATA_PROVIDER=supabase または a1 で切り替える
- composition root（DI 組み立て部分）だけで切り替わるようにする
- ドメイン層・アプリケーション層は変更しない

切り替えを担う factory を実装してください。
```

確認ポイント: 環境変数を変えるだけで両方式が動くこと。

---

## ステップ7: Coolify にデプロイ

```
nagomi 本体を Coolify にデプロイしたいです。

既知の落とし穴を踏まえて:
- Docker Compose で build する形にする
- Next.js は 0.0.0.0 で listen させる
- Traefik ルーティングは動的設定ファイルで直接書く前提（Coolify 自動生成は信用しない）
- サブドメインは nagomi.chapy0706.com（1段）

Dockerfile と docker-compose.prod.yml を作ってください。
nagomi はモノレポではなく単一アプリなので、czz のような複雑さはないはずです。
```

確認ポイント: Coolify で Running になり、A1 内部の curl で 200 が返ること。

---

## ステップ8: Cloudflare Tunnel と疎通確認

```
nagomi.chapy0706.com を Cloudflare Tunnel に追加して外部公開したいです。

- cloudflared の config.yml に追記する（tunnel/credentials-file の行を消さない）
- cloudflared tunnel route dns で DNS 登録する
- Traefik 動的設定ファイルに nagomi 本体のルートを追加する

最後に、ログイン → アバター表示 → Presence 同期（nagomi-ws 連携）まで
一連の流れが動くことを確認したいです。
```

確認ポイント: 外部から nagomi.chapy0706.com にアクセスして全機能が動くこと。

---

## 進め方の原則

- 1ステップずつ進め、確認できてから次へ
- 詰まったら区間で切り分ける（コンテナ → 内部疎通 → Traefik → Tunnel → 外部）
- ステップ完了ごとに nagomi リポジトリに commit する
- 既存の Supabase 実装は最後まで消さない（切り戻し可能を維持）
- 認証方式は変えない（issue-33 まで触らない）
- RLS の判断は ADR に残す
