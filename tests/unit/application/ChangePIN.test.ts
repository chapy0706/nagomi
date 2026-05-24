import { describe, expect, it } from "vitest";
import { ChangePIN } from "@/src/application/use-cases/ChangePIN";
import type { AuthGateway, AuthResult } from "@/src/domain/ports/AuthGateway";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

function makeEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: "uuid-1",
    employeeId: EmployeeId.parse("100000001"),
    displayName: "Test User",
    isActive: true,
    authUserId: "auth-uuid",
    consentAcceptedAt: undefined,
    ...overrides,
  };
}

function makeAuthGateway(signInResult: AuthResult): AuthGateway {
  return {
    signIn: async () => signInResult,
    signOut: async () => {},
    getAuthUserId: async () => undefined,
    updatePassword: async () => {},
  };
}

function makeEmployeeRepository(employee: Employee | undefined): EmployeeRepository {
  return {
    findByEmployeeId: async () => undefined,
    findByAuthUserId: async () => employee,
    recordConsent: async () => {},
  };
}

describe("ChangePIN", () => {
  it("正しい現PINと有効な新PINで変更に成功する", async () => {
    const useCase = new ChangePIN(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(makeEmployee())
    );
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      currentPin: "123456",
      newPin: "654321",
      confirmPin: "654321",
    });
    expect(result.success).toBe(true);
  });

  it("新PINと確認PINが一致しない場合はエラー", async () => {
    const useCase = new ChangePIN(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(makeEmployee())
    );
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      currentPin: "123456",
      newPin: "654321",
      confirmPin: "999999",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBe("新しいPINが一致しません");
  });

  it("新PINが5桁以下の場合はエラー", async () => {
    const useCase = new ChangePIN(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(makeEmployee())
    );
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      currentPin: "123456",
      newPin: "12345",
      confirmPin: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBe("PINは6桁以上の数字を入力してください");
  });

  it("現PINが誤っている場合はエラー", async () => {
    const useCase = new ChangePIN(
      makeAuthGateway({ success: false, reason: "invalid_credentials" }),
      makeEmployeeRepository(makeEmployee())
    );
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      currentPin: "wrong",
      newPin: "654321",
      confirmPin: "654321",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBe("現在のPINが正しくありません");
  });

  it("is_active = false の社員はエラー", async () => {
    const useCase = new ChangePIN(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(makeEmployee({ isActive: false }))
    );
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      currentPin: "123456",
      newPin: "654321",
      confirmPin: "654321",
    });
    expect(result.success).toBe(false);
  });

  it("社員が見つからない場合はエラー", async () => {
    const useCase = new ChangePIN(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(undefined)
    );
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      currentPin: "123456",
      newPin: "654321",
      confirmPin: "654321",
    });
    expect(result.success).toBe(false);
  });
});
