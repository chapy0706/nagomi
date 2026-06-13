import { describe, expect, it, vi } from "vitest";
import { CompleteTutorial } from "@/src/application/use-cases/CompleteTutorial";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

const FIXED_NOW = new Date("2026-06-13T10:00:00Z");

function makeEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: "uuid-1",
    employeeId: EmployeeId.parse("100000001"),
    displayName: "Test User",
    isActive: true,
    authUserId: "auth-uuid",
    consentAcceptedAt: FIXED_NOW,
    tutorialCompletedAt: undefined,
    avatarUrl: undefined,
    ...overrides,
  };
}

function makeRepo(
  employee: Employee | undefined,
  completeTutorialFn: () => Promise<void> = async () => {}
): EmployeeRepository {
  return {
    findByEmployeeId: async () => undefined,
    findByAuthUserId: async () => employee,
    recordConsent: async () => {},
    completeTutorial: vi.fn(completeTutorialFn),
    updateDisplayName: async () => {},
    updateAvatarUrl: async () => {},
  };
}

describe("CompleteTutorial", () => {
  it("未完了の社員がチュートリアルを完了するとcompleteTutorialが呼ばれる", async () => {
    const completeTutorialFn = vi.fn(async () => {});
    const useCase = new CompleteTutorial(makeRepo(makeEmployee(), completeTutorialFn));
    const result = await useCase.execute("auth-uuid");
    expect(result.success).toBe(true);
    expect(completeTutorialFn).toHaveBeenCalledOnce();
  });

  it("すでに完了済みの場合はcompleteTutorialを呼ばずに成功する", async () => {
    const completeTutorialFn = vi.fn(async () => {});
    const employee = makeEmployee({ tutorialCompletedAt: FIXED_NOW });
    const useCase = new CompleteTutorial(makeRepo(employee, completeTutorialFn));
    const result = await useCase.execute("auth-uuid");
    expect(result.success).toBe(true);
    expect(completeTutorialFn).not.toHaveBeenCalled();
  });

  it("社員が見つからない場合はエラー", async () => {
    const useCase = new CompleteTutorial(makeRepo(undefined));
    const result = await useCase.execute("unknown");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBeTruthy();
  });
});
