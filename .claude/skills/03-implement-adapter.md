# Skill: Adapter（Gateway / Repository 実装）の実装パターン

このスキルは、nagomi における Infrastructure 層の Adapter 実装手順とパターンを定義します。
Adapter は Domain 層で定義された Port interface の具象実装です。

---

## Adapter の責務

- Domain の Port interface を実装する
- Supabase クライアントを通じて DB・Auth・Realtime にアクセスする
- 外部の型を Domain の型に変換する（境界での変換）
- 業務判断を持たない
- ログ系テーブルでは追記のみを徹底する

---

## ファイル配置

```
src/infrastructure/supabase/
├── SupabaseAuthGateway.ts
├── SupabaseEmployeeRepository.ts
├── SupabaseAttendanceRepository.ts
├── SupabaseAttendanceRepository.integration.test.ts
└── client.ts                       // Supabase クライアント生成

supabase/
├── migrations/
│   └── YYYYMMDDHHMMSS_create_attendance_logs.sql
└── seed.sql
```

---

## 実装テンプレート

### Repository 実装（infrastructure/supabase/SupabaseEmployeeRepository.ts）

```ts
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmployeeRepository } from '../../domain/ports/EmployeeRepository'
import type { EmployeeId } from '../../domain/value-objects/EmployeeId'
import { Employee } from '../../domain/entities/Employee'

// DB 行の境界スキーマ（unknown を Zod parse して型の嘘を防ぐ）
const EmployeeRowSchema = z.object({
  employee_id: z.string(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  consent_accepted_at: z.string().nullable(),
})

export class SupabaseEmployeeRepository implements EmployeeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findActiveById(id: EmployeeId): Promise<Employee | undefined> {
    const { data, error } = await this.client
      .from('employees')
      .select('employee_id, display_name, avatar_url, consent_accepted_at')
      .eq('employee_id', id.value)
      .eq('is_active', true)
      .maybeSingle()

    if (error !== null) {
      throw new Error(`SupabaseEmployeeRepository.findActiveById: ${error.message}`)
    }
    if (data === null) {
      return undefined
    }

    const row = EmployeeRowSchema.parse(data)
    return Employee.restore({
      employeeId: row.employee_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url ?? undefined,
      consentAcceptedAt: row.consent_accepted_at
        ? new Date(row.consent_accepted_at)
        : undefined,
    })
  }
}
```

### 追記のみログ Repository（infrastructure/supabase/SupabaseAttendanceRepository.ts）

ログ系テーブルは INSERT のみ。終了時刻の確定だけ、限定的に UPDATE を許します。

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AttendanceRepository } from '../../domain/ports/AttendanceRepository'
import type { AttendanceLog } from '../../domain/entities/AttendanceLog'

export class SupabaseAttendanceRepository implements AttendanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  // 追記: ログイン記録の作成
  async appendLogin(log: AttendanceLog): Promise<void> {
    const { error } = await this.client.from('attendance_logs').insert({
      employee_auth_id: log.employeeAuthId,
      logged_in_at: log.loggedInAt.toISOString(),
      source: log.source,
    })
    if (error !== null) {
      throw new Error(`SupabaseAttendanceRepository.appendLogin: ${error.message}`)
    }
  }

  // 例外的に許す UPDATE: 終了時刻（logged_out_at）の確定のみ
  // それ以外の列は書き換えないこと。DELETE は運用バッチ専用。
  async finalizeLogout(logId: string, loggedOutAt: Date): Promise<void> {
    const { error } = await this.client
      .from('attendance_logs')
      .update({ logged_out_at: loggedOutAt.toISOString() })
      .eq('id', logId)
      .is('logged_out_at', null)
    if (error !== null) {
      throw new Error(`SupabaseAttendanceRepository.finalizeLogout: ${error.message}`)
    }
  }
}
```

### マイグレーション（supabase/migrations/）

```sql
-- YYYYMMDDHHMMSS_create_attendance_logs.sql
create table attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_auth_id uuid not null references auth.users(id),
  logged_in_at timestamptz not null default now(),
  logged_out_at timestamptz,
  source text not null check (source in ('explicit', 'inferred'))
);

alter table attendance_logs enable row level security;

-- 本人のみ参照可能
create policy "select own attendance" on attendance_logs
  for select using (auth.uid() = employee_auth_id);

-- 本人のみ追記可能
create policy "insert own attendance" on attendance_logs
  for insert with check (auth.uid() = employee_auth_id);

-- UPDATE / DELETE のポリシーは作らない（service_role のみが操作可能）
```

---

## トランザクション境界の扱い方

複数テーブルを更新する場合は、Transactor Port を経由します。

```ts
// domain/ports/Transactor.ts
export interface Transactor {
  withTx<T>(fn: (ctx: TxContext) => Promise<T>): Promise<T>
}
```

UseCase は `Transactor` を注入され、Repository は `TxContext` 経由で同一トランザクションを共有します。

---

## 統合テストテンプレート（ローカル Supabase）

統合テストはローカル Supabase（`make db/start`）に対して実行します。

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseAttendanceRepository } from './SupabaseAttendanceRepository'

describe('SupabaseAttendanceRepository (integration)', () => {
  let repo: SupabaseAttendanceRepository

  beforeAll(() => {
    const client = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    )
    repo = new SupabaseAttendanceRepository(client)
  })

  it('ログイン記録を追記できる', async () => {
    // appendLogin を呼び、行が作成されることを検証する
    expect(repo).toBeDefined()
  })
})
```

統合テストは `test/integration` プロジェクト（`make test/integ`）で実行します。

---

## 確認チェックリスト

- [ ] Domain の Port interface を正しく実装している
- [ ] DB 行を Zod parse してから Domain の型に変換している
- [ ] エラーが `Adapter名.メソッド名: ...` の形式で文脈付きになっている
- [ ] 業務判断を Adapter 内に書いていない
- [ ] ログ系テーブルへの操作が INSERT のみ（終了時刻確定の UPDATE を除く）
- [ ] マイグレーションで RLS を有効化し、UPDATE/DELETE ポリシーを作っていない
- [ ] 統合テストが追加されている（または TODO として Issue に残している）
- [ ] `make verify` が通る
