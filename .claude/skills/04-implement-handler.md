# Skill: Route Handler / Server Action の実装パターン

このスキルは、nagomi における Presentation 層の入口（Next.js App Router の Route Handler および Server Action）の実装手順とパターンを定義します。

---

## Handler の責務

- リクエストの境界で入力を Zod parse する
- UseCase の Input に変換する
- UseCase を呼び出す
- UseCase の Output / ドメインエラーをレスポンスに変換する
- 業務判断を持たない
- 認証チェックはミドルウェア / セッションヘルパーに委ねる

---

## ファイル配置

```
src/presentation/
├── app/
│   └── api/
│       └── auth/
│           └── login/
│               └── route.ts        // Route Handler
├── actions/
│   └── authenticate.ts              // Server Action
└── lib/
    └── session.ts                   // 認証セッション取得ヘルパー
```

---

## 実装テンプレート

### Route Handler（app/api/auth/login/route.ts）

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthenticateEmployee } from '../../../../application/use-cases/AuthenticateEmployee'
import { EmployeeNotActiveError, InvalidCredentialsError } from '../../../../domain/errors'
import { buildAuthenticateEmployee } from '../../../lib/container'

// 1. 境界スキーマ（unknown を parse して型の嘘を通さない）
const LoginRequestSchema = z.object({
  employeeId: z.string(),
  pin: z.string(),
})

export async function POST(request: Request): Promise<NextResponse> {
  // 2. 入力のパース
  const json: unknown = await request.json()
  const parsed = LoginRequestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '入力が正しくありません' },
      { status: 400 },
    )
  }

  // 3. UseCase の組み立てと実行
  const useCase: AuthenticateEmployee = buildAuthenticateEmployee()
  try {
    const out = await useCase.execute({
      rawEmployeeId: parsed.data.employeeId,
      pin: parsed.data.pin,
    })
    return NextResponse.json(out, { status: 200 })
  } catch (error) {
    // 4. ドメインエラーをレスポンスに変換
    if (
      error instanceof EmployeeNotActiveError ||
      error instanceof InvalidCredentialsError
    ) {
      // 失敗理由を具体的に漏らさない（ユーザーに優しく、かつ安全に）
      return NextResponse.json(
        { error: '社員IDまたはPINが正しくありません' },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { error: '時間をおいて、もう一度お試しください' },
      { status: 500 },
    )
  }
}
```

### Server Action 版（actions/authenticate.ts）

フォーム送信から直接呼ぶ場合は Server Action を使います。境界での parse は同じです。

```ts
'use server'

import { z } from 'zod'
import { buildAuthenticateEmployee } from '../lib/container'

const LoginInputSchema = z.object({
  employeeId: z.string(),
  pin: z.string(),
})

export type LoginResult =
  | { ok: true; needsOnboarding: boolean }
  | { ok: false; message: string }

export async function authenticate(formData: FormData): Promise<LoginResult> {
  const parsed = LoginInputSchema.safeParse({
    employeeId: formData.get('employeeId'),
    pin: formData.get('pin'),
  })
  if (!parsed.success) {
    return { ok: false, message: '入力が正しくありません' }
  }

  try {
    const out = await buildAuthenticateEmployee().execute({
      rawEmployeeId: parsed.data.employeeId,
      pin: parsed.data.pin,
    })
    return { ok: true, needsOnboarding: out.needsOnboarding }
  } catch {
    return { ok: false, message: '社員IDまたはPINが正しくありません' }
  }
}
```

---

## 認証セッションの扱い

- 認証チェックは `middleware.ts` とセッションヘルパー（`lib/session.ts`）に委ねる
- Handler / Action 内で「認証済みユーザー ID」を取得する場合はヘルパー経由にする
- 認証済みユーザー ID と、操作対象のユーザー ID を混同しないこと
- Server Component に渡すユーザー情報は最小化する（PIN・トークンを渡さない）

---

## 依存の組み立て（lib/container.ts）

UseCase と Adapter の結線は Presentation 層の合成位置（container）で行います。
UseCase / Domain の内部では具象を new しません。

```ts
import { AuthenticateEmployee } from '../../application/use-cases/AuthenticateEmployee'
import { SupabaseAuthGateway } from '../../infrastructure/supabase/SupabaseAuthGateway'
import { SupabaseEmployeeRepository } from '../../infrastructure/supabase/SupabaseEmployeeRepository'
import { createServerClient } from '../../infrastructure/supabase/client'

export function buildAuthenticateEmployee(): AuthenticateEmployee {
  const client = createServerClient()
  return new AuthenticateEmployee(
    new SupabaseAuthGateway(client),
    new SupabaseEmployeeRepository(client),
  )
}
```

---

## 確認チェックリスト

- [ ] リクエスト境界で Zod parse している（unknown を直接使っていない）
- [ ] Handler / Action に業務判断を書いていない
- [ ] 認証チェックをミドルウェア / セッションヘルパーに委ねている
- [ ] 認証済みユーザー ID と操作対象ユーザー ID を混同していない
- [ ] ドメインエラーを適切なステータス / 結果に変換している
- [ ] エラーメッセージで失敗理由を不必要に詳細化していない
- [ ] UseCase と Adapter の結線を container で行っている
- [ ] `make verify` が通る
