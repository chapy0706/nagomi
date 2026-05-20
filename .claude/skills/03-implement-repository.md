# Skill: Repository の実装パターン

このスキルは、go-attendance における Repository（Adapter 層）の実装手順とパターンを定義します。

---

## Repository の責務

- Port interface の実装を提供する
- sqlc 生成コードを通じて PostgreSQL にアクセスする
- トランザクション境界を明示する
- 業務判断を持たない

---

## ファイル配置

```
apps/api/internal/adapter/postgres/
├── attendance_repository.go   // Repository 実装
└── attendance_repository_test.go  // Testcontainers 統合テスト

db/
├── migrations/
│   └── YYYYMMDDHHMMSS_create_attendance_events.sql
└── queries/
    └── attendance.sql         // sqlc が読む SQL

apps/api/internal/adapter/postgres/db/  // sqlc 生成コード（手で編集しない）
├── db.go
├── models.go
└── attendance.sql.go
```

---

## 実装テンプレート

### Repository 本体（adapter/postgres/attendance_repository.go）

```go
package postgres

import (
    "context"
    "fmt"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/your-org/attendance-app/apps/api/internal/adapter/postgres/db"
    "github.com/your-org/attendance-app/apps/api/internal/domain/attendance"
)

type AttendanceRepository struct {
    pool    *pgxpool.Pool
    queries *db.Queries
}

func NewAttendanceRepository(pool *pgxpool.Pool) *AttendanceRepository {
    return &AttendanceRepository{
        pool:    pool,
        queries: db.New(pool),
    }
}

func (r *AttendanceRepository) AppendEvent(ctx context.Context, event attendance.Event) error {
    _, err := r.queries.InsertAttendanceEvent(ctx, db.InsertAttendanceEventParams{
        ID:        event.ID,
        UserID:    event.UserID,
        EventType: string(event.Type),
        OccurredAt: event.OccurredAt,
    })
    if err != nil {
        return fmt.Errorf("AttendanceRepository.AppendEvent: %w", err)
    }
    return nil
}

func (r *AttendanceRepository) HasActiveSession(ctx context.Context, userID string, at time.Time) (bool, error) {
    count, err := r.queries.CountActiveSession(ctx, db.CountActiveSessionParams{
        UserID:  userID,
        WorkDate: at,
    })
    if err != nil {
        return false, fmt.Errorf("AttendanceRepository.HasActiveSession: %w", err)
    }
    return count > 0, nil
}
```

### sqlc クエリ（db/queries/attendance.sql）

```sql
-- name: InsertAttendanceEvent :one
INSERT INTO attendance_events (
    id, user_id, event_type, occurred_at, sequence
) VALUES (
    $1, $2, $3, $4, nextval('attendance_events_sequence_seq')
)
RETURNING *;

-- name: CountActiveSession :one
SELECT COUNT(*) FROM work_sessions
WHERE user_id = $1
  AND work_date = $2::date
  AND clock_out_at IS NULL;
```

---

## トランザクション境界の扱い方

複数テーブルを更新する UseCase では、Port に `Tx` を渡すパターンを使います。

```go
// port/transaction.go
type Transactor interface {
    WithTx(ctx context.Context, fn func(ctx context.Context) error) error
}

// adapter/postgres/transactor.go
func (t *PgTransactor) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
    tx, err := t.pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback(ctx)

    if err := fn(postgres.ContextWithTx(ctx, tx)); err != nil {
        return err
    }
    return tx.Commit(ctx)
}
```

---

## 統合テストテンプレート（Testcontainers）

```go
//go:build integration

package postgres_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestAttendanceRepository_AppendEvent_Integration(t *testing.T) {
    ctx := context.Background()

    pgContainer, err := postgres.RunContainer(ctx,
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
    )
    if err != nil {
        t.Fatalf("failed to start container: %v", err)
    }
    defer pgContainer.Terminate(ctx)

    // マイグレーション適用・接続・テスト
    // ...
}
```

---

## 確認チェックリスト

- [ ] sqlc 生成コードを手で編集していない
- [ ] エラーが `fmt.Errorf("Repository名.Method名: %w", err)` でラップされている
- [ ] 業務判断を Repository 内に書いていない
- [ ] Projection の直接更新を行っていない
- [ ] 統合テストが追加されている（または TODO として Issue に残している）
- [ ] `make verify` が通る
