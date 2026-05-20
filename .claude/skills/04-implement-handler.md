# Skill: HTTP Handler の実装パターン

このスキルは、go-attendance における HTTP Handler（Adapter 層）の実装手順とパターンを定義します。

---

## Handler の責務

- HTTP リクエストをデコードして UseCase の Input に変換する
- UseCase を呼び出す
- UseCase の Output を HTTP レスポンスに変換する
- 業務判断を持たない
- 認証チェックはミドルウェアに委ねる

---

## 実装テンプレート

### Handler 本体（adapter/handler/attendance_handler.go）

```go
package handler

import (
    "encoding/json"
    "errors"
    "net/http"

    "github.com/your-org/attendance-app/apps/api/internal/domain/attendance"
    uc "github.com/your-org/attendance-app/apps/api/internal/usecase/attendance"
)

type AttendanceHandler struct {
    clockIn *uc.ClockInUseCase
}

func NewAttendanceHandler(clockIn *uc.ClockInUseCase) *AttendanceHandler {
    return &AttendanceHandler{clockIn: clockIn}
}

func (h *AttendanceHandler) ClockIn(w http.ResponseWriter, r *http.Request) {
    // 1. Idempotency-Key の取得（打刻系は必須）
    idempotencyKey := r.Header.Get("Idempotency-Key")
    if idempotencyKey == "" {
        respondError(w, http.StatusBadRequest, "Idempotency-Key header is required")
        return
    }

    // 2. 認証済みユーザー ID の取得（ミドルウェアで設定済み）
    userID, ok := UserIDFromContext(r.Context())
    if !ok {
        respondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }

    // 3. UseCase 実行
    out, err := h.clockIn.Execute(r.Context(), uc.ClockInInput{
        UserID:    userID,
        RequestID: idempotencyKey,
    })
    if err != nil {
        switch {
        case errors.Is(err, attendance.ErrAlreadyClockedIn):
            respondError(w, http.StatusConflict, "already clocked in")
        default:
            respondError(w, http.StatusInternalServerError, "internal error")
        }
        return
    }

    // 4. レスポンス
    respondJSON(w, http.StatusCreated, map[string]string{
        "event_id": out.EventID,
    })
}
```

### 共通レスポンスヘルパー（adapter/handler/response.go）

```go
package handler

import (
    "encoding/json"
    "net/http"
)

func respondJSON(w http.ResponseWriter, status int, body any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(body)
}

func respondError(w http.ResponseWriter, status int, message string) {
    respondJSON(w, status, map[string]string{"error": message})
}
```

---

## Zod によるリクエストバリデーション（フロントエンド側）

フロントエンドのリクエスト境界では Zod で型を保護してください。

```ts
const ClockInRequestSchema = z.object({
  // 打刻系はボディなし（サーバー時刻を使うため）
});

const ClockInResponseSchema = z.object({
  event_id: z.string().uuid(),
});
```

---

## ルーティング（chi の場合）

```go
r := chi.NewRouter()
r.Use(AuthMiddleware(authProvider))

r.Post("/api/attendance/clock-in", attendanceHandler.ClockIn)
r.Post("/api/attendance/clock-out", attendanceHandler.ClockOut)
r.Post("/api/work-sessions/{id}/break-minutes/change", attendanceHandler.ChangeBreakMinutes)
r.Post("/api/work-sessions/{id}/project/change", attendanceHandler.ChangeProject)
r.Post("/api/transportation-claims/{id}/correct", transportationHandler.Correct)
```

---

## 確認チェックリスト

- [ ] Handler に業務判断を書いていない
- [ ] 認証チェックをミドルウェアに委ねている
- [ ] 打刻系で Idempotency-Key を必須チェックしている
- [ ] 認証済みユーザー ID と操作対象ユーザー ID を混同していない
- [ ] ドメインエラーを適切な HTTP ステータスに変換している
- [ ] `make verify` が通る
