# nagomi

派遣社員のための、業務終わり・休日にふらっと立ち寄れる2D仮想オフィス。
たまたま居合わせた誰かと声をかけ合うこと、ひとりで居てもいいことを、両方ゆるす場所をつくる。

プロジェクト名の「nagomi」は「和み」から取った。協調と平等を体現したい、という設計思想そのものを名前にしている。

---

## 目次

- [プロダクトの背景と目的](#プロダクトの背景と目的)
- [想定ユーザー](#想定ユーザー)
- [主要機能](#主要機能)
- [非機能要件](#非機能要件)
- [技術スタック](#技術スタック)
- [アーキテクチャ](#アーキテクチャ)
- [ドメインモデル](#ドメインモデル)
- [主要ユースケース](#主要ユースケース)
- [データモデル](#データモデル)
- [セキュリティとプライバシー](#セキュリティとプライバシー)
- [テスト戦略](#テスト戦略)
- [開発フェーズ](#開発フェーズ)
- [セットアップ](#セットアップ)
- [Makeコマンド](#makeコマンド)
- [CI/CD](#cicd)
- [デプロイ](#デプロイ)
- [ディレクトリ構成](#ディレクトリ構成)
- [Claude Codeとの並走](#claude-codeとの並走)
- [アーキテクチャ判断記録](#アーキテクチャ判断記録)

---

## プロダクトの背景と目的

派遣社員には、正社員と比べて会社との接点が薄くなりがちな構造的な課題がある。
雑談する人がいない、相談先がわからない、孤立を感じる。短期離職の背景には、技術的でない、こうした静かな理由が多い。

nagomiは、業務終わりや休日に「ちょっと顔を出してみる」という選択肢をつくることを目指す。
出社の負担なく、誰かと会話できる確率が少しだけ上がる場所。誰もいなくても落ち込まない、ひとりで居ても気まずくない場所。

短期離職の低減を最終的なKPIに置くが、設計の指針はそこに直結しない。
むしろ「来た人が安心して帰れること」「来なかった日を責められないこと」を、機能の選択基準にしている。

## 想定ユーザー

- モダンでオシャレな会社で働くことに憧れを持つ20代の新人層が中心
- スマホネイティブ世代。PCより先にスマホで触る可能性が高い
- 「スタバでノマドしている感」のような、ゆるい居場所性を求めている
- 強い意志で交流したいわけではなく、なんとなく立ち寄れる場所を求めている

この前提から、UIは「明るく軽やか・ただし主張しすぎない」を基本に置く。
通知やバッジを過剰に出さない。読み込み中の演出も控えめに。「うるさくない」ことが、心地よさの条件になる。

## 主要機能

### 認証

- 9桁の社員IDによるホワイトリスト方式
- メールアドレスは保有しない前提
- 管理者が事前に発行したアカウントのみログイン可能
- 初回ログイン時にPIN設定と利用同意

### フロアと部屋

- オープンフロア（最大50人想定、自由に歩き回れる空間）
- ラウンジ（2〜3人で雑談する小スペース、5〜6箇所）
- 会議室（5人以上が参加できる独立空間、複数）
- 大規模交流会用のフロア（30人規模）

### アバターと移動

- 表示名は初期値「User1」「User2」のような匿名形式（自由に変更可能）
- アバター画像は自由にアップロード・変更可能
- フロア上を移動するとリアルタイムで他者にも反映される
- 自身のステータス（ログイン中・取り込み中・離席中）を手動で切り替え可能
- 通話中は自動的に「通話中」が表示される（手動ステータスは内部で保持され、通話終了後に復元）

### 会話の開始

- 距離が近づいただけでは通話は始まらない
- 必ず明示的な合意ステップを挟む（招待→承諾→接続）
- 会議室は入室前にロビー画面で「参加しますか」を確認
- 通話開始時はカメラOFF・マイクONをデフォルトとする（音声中心の文化）

### 会話グループの可視化

外から会話の状況がわかることで、「入っていいかどうか」の判断材料を提供する。

- 参加人数
- トピック種別（面談 / 悩み相談 / 雑談）
- 経過時間
- 直近の発話状況（盛り上がり度の目安）

トピック種別は会話開始時に発起人が選択する。義務ではないが、選んだほうが他人が入りやすくなる。

### 通報・ブロック

- ユーザー単位のブロック機能（その人からの招待が届かなくなる）
- 匿名通報フォーム（内容は本人に開示されず、管理者にのみ届く）
- 通報はログに残り、パターン検知の判断材料になる

### 勤怠記録

- ログイン・ログアウトのタイムスタンプを記録
- 通話への参加・退出のタイムスタンプを記録
- 厳格な勤怠管理ではなく、管理者が参加時間を把握できるレベルの精度
- ユーザー自身は自分の記録を閲覧可能、改竄不可

### 管理者ダッシュボード

- 日次・週次のアクティブ人数推移
- 時間帯別の利用傾向
- 通話発生数の推移
- ユーザー満足度の集計
- 個人特定可能な利用ログは表示しない（プライバシー保護の倫理を機能で担保する）

### ユーザー満足度測定

- セッション終了時に簡易アンケート（1〜5の評価＋任意コメント）
- 月次でNPSライクな指標も任意で取得
- 結果は個人を切り離して集計され、ダッシュボードに反映

### チュートリアル

- 初回ログイン時に3〜4ステップの軽いツアー
- 「無理に通話しなくていい」「断ることが正しい使い方」というメッセージを最初に共有する
- スキップ可能だが、後から再表示できる

## 非機能要件

| 観点 | 要件 |
|---|---|
| 想定同時接続 | 50人 |
| デプロイコスト | 基本的に無料枠で運用可能 |
| 対応デバイス | PC優先・スマホでも基本機能が使えること |
| ブラウザ | モダンブラウザ最新2バージョン |
| アクセシビリティ | キーボード操作・スクリーンリーダー対応を意識 |
| 言語 | 日本語のみ（初期段階） |

## 技術スタック

| 層 | 採用 | 理由 |
|---|---|---|
| 言語 | TypeScript | 型安全性・チーム開発の文書性 |
| フレームワーク | Next.js (App Router) | RSC/Server Actionsで認証境界を構築しやすい |
| UI | Tailwind CSS + shadcn/ui | デザインの一貫性・アクセシビリティ標準対応 |
| 2D描画 | React DOM + CSS（必要に応じてPhaser.js検討） | 50人規模ならDOMで十分・必要なら段階的に置き換え |
| 認証 | Supabase Auth | RLSと統合可能・JWT管理が標準化されている |
| DB | Supabase Postgres + RLS | 行レベルセキュリティで認可をDB側に集約 |
| リアルタイム | Supabase Realtime (Presence + Broadcast) | サーバ運用不要・無料枠で50人規模に到達可能 |
| 通話 | Jitsi Meet (meet.jit.si を埋め込み) | 無料・ゲスト参加可能・人数制限ゆるい |
| パッケージ管理 | pnpm（固定） | 高速・ディスク効率・モノレポ対応の余地 |
| Lint/Format | Biome | ESLint + Prettierを統合・高速 |
| ユニットテスト | Vitest | ESM・TypeScript親和性・Jest互換 |
| E2Eテスト | Playwright | 複数ブラウザ・モバイルエミュレーション可能 |
| タスクランナー | Make | デプロイ・マイグレーション含む全コマンドの一元化 |
| CI/CD | GitHub Actions | OSSとの親和性・無料枠の充実 |
| デプロイ | Vercel (Next.js) + Supabase | 設定で迷わない・無料枠が組み合わせやすい |
| 監視 | Vercel Analytics + Supabase Logs | 初期段階は最小構成 |

## アーキテクチャ

Clean Architectureをベースにしつつ、規模に対して過剰にならないよう3層構成にまとめる。
依存方向は常に内側（domain）に向く。外側の都合がドメインに漏れないことを設計の原則とする。

```
[presentation: Next.js] -> [application: ユースケース] -> [domain: エンティティと値オブジェクト]
                                       |
                                       v
                              [infrastructure: 外界アダプタ]
```

- ドメインはフレームワーク非依存の純粋なTypeScript
- ポート（interface）でフレームワーク依存を遮断
- ユースケースは「動詞」で書き、ドメインを操作する手順を表現する
- インフラはポートの具象実装としてのみ存在する

### UNIX哲学の反映

- ひとつのモジュールはひとつのことだけ責任を持つ
- 各ゲートウェイ（Auth / Presence / Video）は互いを知らない
- 観測しやすい単位で機能を切る（テストしやすさ＝小ささ）

## ドメインモデル

### 主要エンティティ

| エンティティ | 役割 |
|---|---|
| Employee | 社員。社員IDが本質的なアイデンティティ |
| Avatar | フロア上の存在。Employee参照と位置・状態 |
| Floor | 移動可能な空間。Avatarの集合を持つ |
| Lounge | 雑談用の小スペース。CallSessionの母体 |
| MeetingRoom | 会議室。予約と定員の概念を持つ |
| CallSession | 通話セッション。トピック種別と参加者 |
| CallInvitation | 通話招待。承諾/拒否/失効の状態を持つ |
| AttendanceLog | 在席記録 |
| CallParticipationLog | 通話参加記録 |
| Report | 通報 |
| Satisfaction | 満足度評価 |

### 主要な値オブジェクト

| 値オブジェクト | 制約 |
|---|---|
| EmployeeId | 9桁数値・チェックロジックを内包 |
| Position | x, y座標・範囲チェック |
| RoomCapacity | 定員の最小/最大ルール |
| PresenceState | 手動ステータスと派生ステータスを分離して保持 |
| CallTopic | available / counseling / casual のいずれか |
| DisplayName | 1〜30文字・禁止文字チェック |

### ポート（外界とのインターフェース）

| ポート | 役割 |
|---|---|
| AuthGateway | サインイン・サインアウト・セッション取得 |
| PresenceGateway | 在席状態と位置の同期 |
| VideoRoomGateway | 通話ルームへの参加・退出 |
| EmployeeRepository | 社員情報の取得・ホワイトリスト確認 |
| AttendanceRepository | 在席ログの永続化 |
| CallLogRepository | 通話ログの永続化 |
| ReportGateway | 通報の送信 |

## 主要ユースケース

### 認証フロー

```
AuthenticateEmployee
  入力: 社員ID + PIN
  処理:
    1. 社員IDの形式チェック (EmployeeId値オブジェクト)
    2. EmployeeRepository.findActiveById で有効性確認
    3. AuthGateway.signIn で擬似メール形式に変換しSupabase Authへ
    4. 利用同意状態の確認 (未同意なら同意フローへ)
    5. RecordLogin ユースケースを副作用として実行
  出力: 認証済みセッション
```

### フロア入室と移動

```
EnterFloor
  入力: 認証済みEmployee, FloorId
  処理:
    1. 既存のpresenceから退出
    2. PresenceGateway.join で対象フロアへ
    3. 初期位置を割り当て (空いている場所をドメインサービスで決定)

MoveAvatar
  入力: 新しいPosition
  処理:
    1. Position値オブジェクトで範囲・到達可能性を検証
    2. PresenceGateway.updateState で位置を反映
  備考: throttle (200ms) はpresentation層の責務
```

### 通話開始（合意ベース）

```
IssueCallInvitation
  入力: 招待元Employee, 招待先Employee, CallTopic
  処理:
    1. ブロック関係をチェック
    2. CallInvitationを生成（30秒で失効）
    3. PresenceGateway.broadcast で相手のクライアントへ通知

AcceptCallInvitation
  処理:
    1. 招待の有効性確認
    2. VideoRoomGateway.join (カメラOFF・マイクON)
    3. RecordCallJoin で参加ログを記録
    4. PresenceStateを通話中に更新

DeclineCallInvitation
  処理:
    1. 招待を declined 状態に
    2. 招待元へ通知（拒否理由は伝えない・関係性への配慮）
```

### 会議室入室

```
EnterMeetingRoom
  入力: Employee, MeetingRoomId
  処理:
    1. 定員チェック
    2. ロビー画面遷移（マイク・カメラ設定・利用同意の再確認）
    3. 「参加します」確定後にVideoRoomGateway.join
    4. RecordCallJoin
```

### 退出と記録

```
LeaveCallZone
  処理:
    1. VideoRoomGateway.leave
    2. RecordCallLeave (left_at を記録)
    3. PresenceStateを通話前の手動ステータスに復元

RecordLogout
  処理:
    1. AttendanceLog.logged_out_at を更新
    2. 明示退出 / 接続切断検知 のソースをsourceフィールドで区別
```

### 通報

```
SubmitReport
  入力: 通報者Employee, 対象Employee, 内容
  処理:
    1. ReportGatewayに匿名化して送信
    2. 通報者と対象者の関係性は管理者側で集計分析可能
    3. 対象者には通報の事実を通知しない
```

## データモデル

主要なテーブル設計の抜粋（実装時はマイグレーションで管理）。

### employees

ホワイトリスト本体。`auth.users` とは別に管理し、退職時の無効化を容易にする。

```sql
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text UNIQUE NOT NULL CHECK (employee_id ~ '^[0-9]{9}$'),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  display_name text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  consent_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### attendance_logs

```sql
CREATE TABLE attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_auth_id uuid NOT NULL REFERENCES auth.users(id),
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  logged_out_at timestamptz,
  source text NOT NULL CHECK (source IN ('explicit', 'inferred'))
);
```

### call_participation_logs

```sql
CREATE TABLE call_participation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_auth_id uuid NOT NULL REFERENCES auth.users(id),
  room_id text NOT NULL,
  topic text CHECK (topic IN ('counseling', 'casual', 'meeting')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz
);
```

### reports

```sql
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_employee_id uuid NOT NULL REFERENCES employees(id),
  content text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

通報者IDは保存しない設計とすることで、匿名性を構造的に保証する。

### satisfaction_responses

```sql
CREATE TABLE satisfaction_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
```

これも個人特定を避けるため、employee_idを保持しない。

### RLSポリシーの基本方針

- ユーザーは自分のINSERTのみ可能
- 自分のSELECTのみ可能
- UPDATE / DELETE は service_role のみ
- 管理者ダッシュボードは集計クエリのみを許可するビューを別途定義

## セキュリティとプライバシー

### 認証・認可

- ホワイトリスト方式によりサインアップ経路を完全に閉じる
- RLSで認可をDB層に集約し、アプリケーションコードの認可漏れを構造的に防ぐ
- service_roleキーはサーバ側（Edge Function）のみで使用、クライアントには絶対に露出させない

### 通信

- HTTPS強制
- Jitsi iframe の origin を CSP で制限
- Cookieは httpOnly + secure + sameSite=lax

### プライバシー設計

- 通報者の身元を構造的に記録しない
- 満足度回答も個人を特定する情報を持たない
- 管理者でも個人別の利用ログにはアクセスできない（集計ビュー経由のみ）
- 利用ログの保存期間は3ヶ月とし、自動削除のバッチを用意
- 退職時のデータ削除手順を運用ドキュメントで明文化する

### 利用同意

- 初回ログイン時に同意フロー（必須）
- 通話参加時のロビー画面にも「参加することで利用ポリシーに同意したものとみなす」の一文を明示
- 同意内容に変更があった場合は再同意フロー

## テスト戦略

層ごとに役割を分けて、過不足なくテストを書く。

| 層 | テスト種別 | 主なツール | 重点 |
|---|---|---|---|
| domain | ユニット | Vitest | ビジネスルール・値オブジェクトの不変条件 |
| application | ユニット（モック） | Vitest | ユースケースの処理順序・分岐 |
| infrastructure | 統合 | Vitest + Supabase Local | RLSポリシーの動作確認・SQL実行 |
| presentation | コンポーネント | Vitest + Testing Library | ユーザー操作の流れ |
| 全体 | E2E | Playwright | 主要シナリオ（ログイン〜通話開始〜ログアウト） |

### Vitestの方針

- ドメイン層のカバレッジは80%以上を目標
- ユースケースのテストではゲートウェイをモック化し、純粋に処理ロジックを検証
- スナップショットテストは原則使わない（壊れやすく意図が伝わりにくいため）

### Playwrightの方針

- 主要ユーザーシナリオ（5〜7本程度）に絞る
- モバイルビューポートでの確認も含める
- Jitsi接続部分は実通信ではなくモック画面で代替（CI環境の安定性のため）

### Biomeの方針

- Lint + Format を一元化
- pre-commit hookで実行
- CIでもチェック

## 開発フェーズ

各フェーズの終わりにADR（Architecture Decision Record）を1〜2本書き残す。
設計意図の言語化を継続的に行うことが、上流工程への足場になる。

| Phase | ゴール | ドメインで触る範囲 |
|---|---|---|
| 1 | 認証 + フロア入室 + アバター固定表示 | Employee, EmployeeId, DisplayName |
| 2 | アバター移動とpresence同期 | Position, PresenceState, PresenceGateway |
| 3 | 招待ベースの通話開始（Jitsi接続） | CallInvitation, CallSession, VideoRoomGateway |
| 4 | 会議室・ロビー・トピック種別 | MeetingRoom, RoomCapacity, CallTopic |
| 5 | 通報・ブロック・利用同意 | Report, BlockRelation |
| 6 | 勤怠ログ・通話ログの記録 | AttendanceLog, CallParticipationLog |
| 7 | 管理者ダッシュボード・満足度測定 | Satisfaction, 集計ビュー |
| 8 | チュートリアル・スマホ対応の磨き込み | UI最適化 |

## セットアップ

### 前提

- Node.js 20以上
- pnpm 9以上（corepack経由を推奨）
- Make
- Supabaseプロジェクト（無料枠）
- Vercelアカウント（無料枠）

### 初期化

```bash
corepack enable
make setup
cp .env.example .env.local
# 環境変数を設定
make db/migrate
make dev
```

### 環境変数

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
```

## Makeコマンド

全コマンドは `make` 経由に統一する。`make help` で一覧を表示できる。

```bash
make help               # コマンド一覧を表示
make setup              # 初期セットアップ（pnpm install + huskyなど）
make dev                # 開発サーバ起動
make build              # 本番ビルド
make start              # 本番ビルド起動
make lint               # Biomeによる静的解析
make format             # Biomeによるフォーマット
make typecheck          # tscによる型チェック
make test               # 全テスト（ユニット + 統合）
make test/unit          # Vitestユニットテストのみ
make test/integ         # Supabase Localと連動した統合テスト
make test/e2e           # Playwright E2E
make db/migrate         # マイグレーション適用
make db/reset           # マイグレーション全リセット
make db/seed            # 初期データ投入
make db/new name=X      # 新規マイグレーション作成
make verify             # lint + typecheck + test を一括実行（PR前の確認用）
make evidence           # verify + カバレッジ出力
make deploy             # 本番デプロイ（マイグレーション含む）
make clean              # node_modulesとビルド成果物を削除
```

Make は内部で pnpm スクリプトや Supabase CLI を呼び出す薄いラッパーとして機能する。
「ひとつのコマンドに何が起きているか」が `Makefile` を開けば追える状態を維持する。

## CI/CD

`.github/workflows/` 配下に以下を配置する。

| ワークフロー | トリガー | 役割 |
|---|---|---|
| ci.yml | PR / push to main | lint・typecheck・unit/integテスト |
| e2e.yml | PR / 手動実行 | Playwright E2Eテスト |
| deploy.yml | push to main | Supabaseマイグレーション適用 |

Vercelは GitHub 連携で自動デプロイされるため、`deploy.yml` ではDBマイグレーションのみ責務を持つ。
プレビュー環境はVercelがPRごとに自動生成する。

CI失敗時の方針：
- lintとtypecheckはマージブロック
- E2Eの一時的な失敗は再実行可能とし、3回連続で失敗した場合のみブロック対象

## デプロイ

```
[ユーザー]
   |
   v
[Vercel: Next.js]
   |
   +--> [Supabase: Auth / Postgres / Realtime]
   |
   +--> [meet.jit.si: 通話メディア]
```

- Vercelに main ブランチをデプロイ
- プレビュー環境は PR ごとに自動生成
- Supabaseは本番・ステージング・ローカルの3環境を用意
- 環境ごとにJitsiドメインを切り替え可能（将来的に自前ホストに移行する余地）

## ディレクトリ構成

```
nagomi/
├── README.md
├── CLAUDE.md                           # Claude Code エントリーポイント
├── Makefile                            # 全コマンドの一元化
├── package.json                        # pnpm ルート定義
├── pnpm-workspace.yaml                 # ワークスペース設定（必要に応じて）
├── .github/
│   └── workflows/
│       ├── ci.yml                      # lint / typecheck / test
│       ├── e2e.yml                     # Playwright E2E
│       └── deploy.yml                  # Supabaseマイグレーション
├── .claude/
│   ├── README.md                       # .claude ディレクトリの説明
│   ├── settings.json                   # パーミッション・hooks設定
│   ├── rules/
│   │   ├── 01-architecture.md
│   │   ├── 02-security.md
│   │   └── 03-token.md
│   ├── hooks/
│   │   ├── block-dangerous.sh
│   │   └── protect-secrets.sh
│   └── skills/
│       ├── domain-model.md
│       ├── usecase.md
│       ├── react-component.md
│       ├── realtime-presence.md
│       ├── jitsi-integration.md
│       └── test.md
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── services/
│   │   └── ports/
│   ├── application/
│   │   └── use-cases/
│   ├── infrastructure/
│   │   ├── supabase/
│   │   ├── jitsi/
│   │   └── config/
│   └── presentation/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       └── lib/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
└── docs/
    ├── adr/
    ├── diagrams/
    └── privacy-policy.md
```

## Claude Codeとの並走

このプロジェクトはClaude Codeをメインの実装パートナーとして並走する前提で設計されている。

- `CLAUDE.md`（ルート）: Claude Codeがセッション開始時に最初に読む「地図」
- `.claude/rules/`: 守るべき制約（短く・トークン節約）
- `.claude/hooks/`: 危険コマンドの二重ガード・シークレット保護
- `.claude/skills/`: タスク種別ごとの具体的な実装テンプレート

`.claude` 配下は既存プロジェクト（指示厨ゲーム）の構成を横展開する形で導入する。
nagomi固有の調整が必要なファイルだけ差分を当てていく方針。

## アーキテクチャ判断記録

主要な技術選定の理由を ADR として `docs/adr/` に蓄積する。
初期段階で書く予定のADRは以下。

- ADR-001: なぜCloudflareではなくVercelを選んだか
- ADR-002: なぜLiveKitではなくJitsi Meetを選んだか
- ADR-003: なぜRenderでの自前WebSocketではなくSupabase Realtimeを選んだか
- ADR-004: なぜホワイトリスト認証を擬似メール方式で実装したか
- ADR-005: なぜ通報の通報者IDを構造的に記録しないか
- ADR-006: なぜ通話開始に必ず合意ステップを挟むか
- ADR-007: なぜカメラOFFをデフォルトとしたか
- ADR-008: なぜタスクランナーにMakeを選んだか

---

## ライセンス

社内利用前提のため、ライセンスは別途調整。

## 連絡先

開発に関する相談・要望は Issue にて。
