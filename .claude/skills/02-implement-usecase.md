# Skill: UseCase の実装パターン

このスキルは、nagomi における UseCase（Application 層）の実装手順とパターンを定義します。

---

## UseCase の責務

- ドメインルールを適用して処理を進める
- Port（Gateway / Repository interface）を呼び出す
- HTTP・DB・認証・フレームワークの実装に依存しない
- SQL を直接書かない
- 副作用（DB 書き込み・外部呼び出し・Realtime 送信）を UseCase 内で完結させる

---

## ファイル配置

```
src/
├── domain/
│   ├── entities/
│   │   └── Employee.ts
│   ├── value-objects/
│   │   └── EmployeeId.ts
│   ├── errors.ts                 // ドメインエラー定義
│   └── ports/
│       ├── AuthGateway.ts        // Port（interface）
│       ├── EmployeeRepository.ts
│       └── Clock.ts
├── application/
│   └── use-cases/
│       ├── AuthenticateEmployee.ts        // UseCase 本体
│       └── AuthenticateEmployee.test.ts   // 単体テスト
└── infrastructure/
    └── supabase/
        ├── SupabaseAuthGateway.ts         // Port の実装（Adapter）
        └── SupabaseEmployeeRepository.ts
```

---

## 実装テンプレート

### Port interface（domain/ports/AuthGateway.ts）

interface は利用側（domain）に置きます。

```ts
import type { EmployeeId } from '../value-objects/EmployeeId'

export type Session = {
  accessToken: string
  authUserId: string
}

export interface AuthGateway {
  signIn(employeeId: EmployeeId, pin: string): Promise<Session | undefined>
  signOut(): Promise<void>
}
```

### Clock Port（domain/ports/Clock.ts）

時刻は必ず Clock ポート経由で取得します。`new Date()` を直接呼ばないこと。

```ts
export interface Clock {
  now(): Date
}
```

### UseCase 本体（application/use-cases/AuthenticateEmployee.ts）

```ts
import { EmployeeId } from '../../domain/value-objects/EmployeeId'
import type { AuthGateway } from '../../domain/ports/AuthGateway'
import type { EmployeeRepository } from '../../domain/ports/EmployeeRepository'
import { EmployeeNotActiveError, InvalidCredentialsError } from '../../domain/errors'

export type AuthenticateEmployeeInput = {
  rawEmployeeId: string
  pin: string
}

export type AuthenticateEmployeeOutput = {
  employeeId: string
  needsOnboarding: boolean
}

export class AuthenticateEmployee {
  constructor(
    private readonly auth: AuthGateway,
    private readonly employees: EmployeeRepository,
  ) {}

  async execute(
    input: AuthenticateEmployeeInput,
  ): Promise<AuthenticateEmployeeOutput> {
    // 1. 入力の検証（ドメイン層の値オブジェクト）
    const employeeId = EmployeeId.create(input.rawEmployeeId)

    // 2. ホワイトリストの有効性確認（Port 経由）
    const employee = await this.employees.findActiveById(employeeId)
    if (employee === undefined) {
      throw new EmployeeNotActiveError(employeeId.value)
    }

    // 3. 認証（Port 経由・擬似メール変換は AuthGateway 実装側に閉じる）
    const session = await this.auth.signIn(employeeId, input.pin)
    if (session === undefined) {
      throw new InvalidCredentialsError()
    }

    // 4. 初回ログイン判定
    return {
      employeeId: employeeId.value,
      needsOnboarding: employee.consentAcceptedAt === undefined,
    }
  }
}
```

---

## 実装ルール

- UseCase クラスの公開メソッドは `execute(input: XxxInput): Promise<XxxOutput>` に統一する
- 依存（Port）はコンストラクタ注入で受け取る。UseCase 内で具象を new しない
- ドメインエラー（業務ルール違反）は `domain/errors.ts` に定義し、UseCase はそれを throw する
- 時刻処理は Clock ポート経由にする
- 複数テーブルを更新する場合は、トランザクション用の Port（Transactor）を経由する
- ログ系の記録（在席・通話）は追記のみ。終了時刻の確定以外で UPDATE しない

---

## テストテンプレート（Vitest + fake）

Port は fake 実装でテストします。具象（Supabase）には依存させません。

```ts
import { describe, it, expect } from 'vitest'
import { AuthenticateEmployee } from './AuthenticateEmployee'
import type { AuthGateway, Session } from '../../domain/ports/AuthGateway'
import type { EmployeeRepository } from '../../domain/ports/EmployeeRepository'
import type { EmployeeId } from '../../domain/value-objects/EmployeeId'
import { EmployeeNotActiveError } from '../../domain/errors'

class FakeAuthGateway implements AuthGateway {
  constructor(private readonly session: Session | undefined) {}
  async signIn(): Promise<Session | undefined> {
    return this.session
  }
  async signOut(): Promise<void> {}
}

class FakeEmployeeRepository implements EmployeeRepository {
  constructor(
    private readonly employee:
      | { consentAcceptedAt: Date | undefined }
      | undefined,
  ) {}
  async findActiveById(_id: EmployeeId) {
    return this.employee
  }
}

describe('AuthenticateEmployee', () => {
  it('有効な社員が初回ログインのとき needsOnboarding が true', async () => {
    const useCase = new AuthenticateEmployee(
      new FakeAuthGateway({ accessToken: 't', authUserId: 'u' }),
      new FakeEmployeeRepository({ consentAcceptedAt: undefined }),
    )

    const out = await useCase.execute({
      rawEmployeeId: '123456789',
      pin: '0000',
    })

    expect(out.needsOnboarding).toBe(true)
  })

  it('無効な社員のとき EmployeeNotActiveError を投げる', async () => {
    const useCase = new AuthenticateEmployee(
      new FakeAuthGateway(undefined),
      new FakeEmployeeRepository(undefined),
    )

    await expect(
      useCase.execute({ rawEmployeeId: '123456789', pin: '0000' }),
    ).rejects.toBeInstanceOf(EmployeeNotActiveError)
  })
})
```

---

## 確認チェックリスト

実装後に以下を確認してください。

- [ ] UseCase が HTTP / DB / 認証 / フレームワークに直接依存していない
- [ ] 依存（Port）をコンストラクタ注入で受け取っている
- [ ] 時刻処理が Clock ポート経由になっている
- [ ] ドメインエラーが `domain/errors.ts` に定義され、適切に throw されている
- [ ] ログ系テーブルへの記録が追記のみになっている
- [ ] 単体テストが追加されている（Port は fake で差し替え）
- [ ] `make verify` が通る
