import { describe, expect, it } from "vitest";
import { AuthenticateEmployee } from "@/src/application/use-cases/AuthenticateEmployee";
import type { AuthGateway, AuthResult } from "@/src/domain/ports/AuthGateway";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

function makeEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: "uuid-1",
    employeeId: EmployeeId.parse("100000001"),
    displayName: "Test User",
    isActive: true,
    authUserId: undefined,
    ...overrides,
  };
}

function makeAuthGateway(result: AuthResult): AuthGateway {
  return {
    signIn: async () => result,
    signOut: async () => {},
    getAuthUserId: async () => undefined,
  };
}

function makeEmployeeRepository(employee: Employee | undefined): EmployeeRepository {
  return {
    findByEmployeeId: async () => employee,
  };
}

describe("AuthenticateEmployee", () => {
  it("有効な社員IDとPINで認証に成功する", async () => {
    const useCase = new AuthenticateEmployee(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(makeEmployee())
    );
    const result = await useCase.execute({ rawEmployeeId: "100000001", pin: "123456" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.authUserId).toBe("auth-uuid");
  });

  it("不正な社員ID形式はジェネリックエラーを返す", async () => {
    const useCase = new AuthenticateEmployee(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(makeEmployee())
    );
    const result = await useCase.execute({ rawEmployeeId: "12345", pin: "123456" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBe("社員IDまたはPINが正しくありません");
  });

  it("存在しない社員IDはジェネリックエラーを返す", async () => {
    const useCase = new AuthenticateEmployee(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(undefined)
    );
    const result = await useCase.execute({ rawEmployeeId: "100000001", pin: "123456" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBe("社員IDまたはPINが正しくありません");
  });

  it("is_active = false の社員はジェネリックエラーを返す", async () => {
    const useCase = new AuthenticateEmployee(
      makeAuthGateway({ success: true, authUserId: "auth-uuid" }),
      makeEmployeeRepository(makeEmployee({ isActive: false }))
    );
    const result = await useCase.execute({ rawEmployeeId: "100000001", pin: "123456" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBe("社員IDまたはPINが正しくありません");
  });

  it("PINが誤っている場合はジェネリックエラーを返す", async () => {
    const useCase = new AuthenticateEmployee(
      makeAuthGateway({ success: false, reason: "invalid_credentials" }),
      makeEmployeeRepository(makeEmployee())
    );
    const result = await useCase.execute({ rawEmployeeId: "100000001", pin: "wrong" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBe("社員IDまたはPINが正しくありません");
  });
});
