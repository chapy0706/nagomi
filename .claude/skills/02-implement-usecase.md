# Skill: UseCase の実装パターン

このスキルは、go-attendance における UseCase の実装手順とパターンを定義します。

---

## UseCase の責務

- ドメインルールを適用してイベントを生成する
- Port（Repository interface）を呼び出す
- HTTP・DB・認証実装に依存しない
- SQL を直接書かない
- 副作用（DB 書き込み・外部呼び出し）を UseCase 内で完結させる

---

## ファイル配置

```
apps/api/internal/
├── domain/
│   └── attendance/
│       ├── event.go          // イベント型定義
│       └── policy.go         // ドメインルール
├── usecase/
│   └── attendance/
│       └── clock_in.go       // UseCase 本体
├── port/
│   └── attendance_repository.go  // Repository interface
└── adapter/
    └── postgres/
        └── attendance_repository.go  // Repository 実装
```

---

## 実装テンプレート

### UseCase 本体（usecase/attendance/clock_in.go）

```go
package attendance

import (
    "context"
    "fmt"

    "github.com/your-org/attendance-app/apps/api/internal/domain/attendance"
    "github.com/your-org/attendance-app/apps/api/internal/port"
)

type ClockInInput struct {
    UserID    string
    RequestID string // Idempotency-Key
}

type ClockInOutput struct {
    EventID string
}

type ClockInUseCase struct {
    repo  port.AttendanceRepository
    clock port.Clock
}

func NewClockInUseCase(repo port.AttendanceRepository, clock port.Clock) *ClockInUseCase {
    return &ClockInUseCase{repo: repo, clock: clock}
}

func (uc *ClockInUseCase) Execute(ctx context.Context, in ClockInInput) (ClockInOutput, error) {
    now := uc.clock.Now()

    // 1. 重複チェック（業務ルール）
    exists, err := uc.repo.HasActiveSession(ctx, in.UserID, now)
    if err != nil {
        return ClockInOutput{}, fmt.Errorf("ClockInUseCase: check active session: %w", err)
    }
    if exists {
        return ClockInOutput{}, attendance.ErrAlreadyClockedIn
    }

    // 2. イベント生成（ドメイン層）
    event := attendance.NewClockInEvent(in.UserID, now)

    // 3. 永続化（Port 経由）
    if err := uc.repo.AppendEvent(ctx, event); err != nil {
        return ClockInOutput{}, fmt.Errorf("ClockInUseCase: append event: %w", err)
    }

    return ClockInOutput{EventID: event.ID}, nil
}
```

### Port interface（port/attendance_repository.go）

```go
package port

import (
    "context"
    "time"

    "github.com/your-org/attendance-app/apps/api/internal/domain/attendance"
)

type AttendanceRepository interface {
    AppendEvent(ctx context.Context, event attendance.Event) error
    HasActiveSession(ctx context.Context, userID string, at time.Time) (bool, error)
}

type Clock interface {
    Now() time.Time
}
```

---

## 実装ルール

- UseCase の `Execute` メソッドのシグネチャは `(ctx context.Context, in XxxInput) (XxxOutput, error)` に統一する
- エラーは `fmt.Errorf("UseCase名: %w", err)` でラップしてコンテキストを付ける
- ドメインエラー（業務ルール違反）は `domain/attendance/errors.go` に定義する
- DB トランザクションが必要な場合は Port に `WithTx` 相当のパターンで渡す
- Idempotency-Key の確認は UseCase の冒頭で行う

---

## テストテンプレート

```go
package attendance_test

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/your-org/attendance-app/apps/api/internal/usecase/attendance"
)

type fakeRepo struct {
    events        []domain.Event
    hasActiveSession bool
}

func (r *fakeRepo) AppendEvent(_ context.Context, e domain.Event) error {
    r.events = append(r.events, e)
    return nil
}

func (r *fakeRepo) HasActiveSession(_ context.Context, _ string, _ time.Time) (bool, error) {
    return r.hasActiveSession, nil
}

type fixedClock struct{ t time.Time }
func (c fixedClock) Now() time.Time { return c.t }

func TestClockIn_Success(t *testing.T) {
    repo := &fakeRepo{}
    uc := attendance.NewClockInUseCase(repo, fixedClock{t: time.Now()})

    out, err := uc.Execute(context.Background(), attendance.ClockInInput{
        UserID:    "user-1",
        RequestID: "req-1",
    })

    assert.NoError(t, err)
    assert.NotEmpty(t, out.EventID)
    assert.Len(t, repo.events, 1)
}

func TestClockIn_AlreadyClockedIn(t *testing.T) {
    repo := &fakeRepo{hasActiveSession: true}
    uc := attendance.NewClockInUseCase(repo, fixedClock{t: time.Now()})

    _, err := uc.Execute(context.Background(), attendance.ClockInInput{UserID: "user-1"})

    assert.ErrorIs(t, err, domain.ErrAlreadyClockedIn)
}
```

---

## 確認チェックリスト

実装後に以下を確認してください。

- [ ] UseCase が HTTP / DB / 認証に直接依存していない
- [ ] 時刻処理が Clock interface 経由になっている
- [ ] エラーが適切にラップされている
- [ ] 単体テストが追加されている
- [ ] Projection を直接更新していない
- [ ] `make verify` が通る
