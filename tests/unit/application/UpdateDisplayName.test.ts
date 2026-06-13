import { describe, expect, it, vi } from "vitest";
import { UpdateDisplayName } from "@/src/application/use-cases/UpdateDisplayName";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

function makeEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: "uuid-1",
    employeeId: EmployeeId.parse("100000001"),
    displayName: "Test User",
    isActive: true,
    authUserId: "auth-uuid",
    consentAcceptedAt: new Date(),
    tutorialCompletedAt: undefined,
    avatarUrl: undefined,
    ...overrides,
  };
}

function makeRepo(
  employee: Employee | undefined,
  updateFn: () => Promise<void> = async () => {}
): EmployeeRepository {
  return {
    findByEmployeeId: async () => undefined,
    findByAuthUserId: async () => employee,
    recordConsent: async () => {},
    completeTutorial: async () => {},
    updateDisplayName: vi.fn(updateFn),
    updateAvatarUrl: async () => {},
  };
}

describe("UpdateDisplayName", () => {
  it("有効な表示名に更新できる", async () => {
    const updateFn = vi.fn(async () => {});
    const repo = makeRepo(makeEmployee(), updateFn);
    const useCase = new UpdateDisplayName(repo);
    const result = await useCase.execute({ authUserId: "auth-uuid", newDisplayName: "新しい名前" });
    expect(result.success).toBe(true);
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it("空文字はエラーを返す", async () => {
    const useCase = new UpdateDisplayName(makeRepo(makeEmployee()));
    const result = await useCase.execute({ authUserId: "auth-uuid", newDisplayName: "" });
    expect(result.success).toBe(false);
  });

  it("禁止ワード含む表示名はエラーを返す", async () => {
    const useCase = new UpdateDisplayName(makeRepo(makeEmployee()));
    const result = await useCase.execute({ authUserId: "auth-uuid", newDisplayName: "admin太郎" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toContain("admin");
  });

  it("社員が見つからない場合はエラー", async () => {
    const useCase = new UpdateDisplayName(makeRepo(undefined));
    const result = await useCase.execute({ authUserId: "auth-uuid", newDisplayName: "太郎" });
    expect(result.success).toBe(false);
  });

  it("is_active = false の社員はエラー", async () => {
    const useCase = new UpdateDisplayName(makeRepo(makeEmployee({ isActive: false })));
    const result = await useCase.execute({ authUserId: "auth-uuid", newDisplayName: "太郎" });
    expect(result.success).toBe(false);
  });
});
