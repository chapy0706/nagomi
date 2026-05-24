import { describe, expect, it, vi } from "vitest";
import { AcceptConsent } from "@/src/application/use-cases/AcceptConsent";
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
    avatarUrl: undefined,
    ...overrides,
  };
}

function makeEmployeeRepository(
  employee: Employee | undefined,
  recordConsentFn: () => Promise<void> = async () => {}
): EmployeeRepository {
  return {
    findByEmployeeId: async () => undefined,
    findByAuthUserId: async () => employee,
    recordConsent: recordConsentFn,
    updateDisplayName: async () => {},
    updateAvatarUrl: async () => {},
  };
}

describe("AcceptConsent", () => {
  it("同意済みでない社員が同意するとrecordConsentが呼ばれる", async () => {
    const recordConsent = vi.fn(async () => {});
    const useCase = new AcceptConsent(makeEmployeeRepository(makeEmployee(), recordConsent));
    const result = await useCase.execute({ authUserId: "auth-uuid", agreed: true });
    expect(result.success).toBe(true);
    expect(recordConsent).toHaveBeenCalledOnce();
  });

  it("すでに同意済みの場合はrecordConsentを呼ばずに成功する", async () => {
    const recordConsent = vi.fn(async () => {});
    const employee = makeEmployee({ consentAcceptedAt: new Date() });
    const useCase = new AcceptConsent(makeEmployeeRepository(employee, recordConsent));
    const result = await useCase.execute({ authUserId: "auth-uuid", agreed: true });
    expect(result.success).toBe(true);
    expect(recordConsent).not.toHaveBeenCalled();
  });

  it("agreed = false の場合はエラー", async () => {
    const useCase = new AcceptConsent(makeEmployeeRepository(makeEmployee()));
    const result = await useCase.execute({ authUserId: "auth-uuid", agreed: false });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.errorMessage).toBe("利用規約とプライバシーポリシーへの同意が必要です");
  });

  it("is_active = false の社員はエラー", async () => {
    const useCase = new AcceptConsent(makeEmployeeRepository(makeEmployee({ isActive: false })));
    const result = await useCase.execute({ authUserId: "auth-uuid", agreed: true });
    expect(result.success).toBe(false);
  });

  it("社員が見つからない場合はエラー", async () => {
    const useCase = new AcceptConsent(makeEmployeeRepository(undefined));
    const result = await useCase.execute({ authUserId: "auth-uuid", agreed: true });
    expect(result.success).toBe(false);
  });
});
