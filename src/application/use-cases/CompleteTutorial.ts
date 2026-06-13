import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";

export type CompleteTutorialResult = { success: true } | { success: false; errorMessage: string };

export class CompleteTutorial {
  constructor(private readonly repo: EmployeeRepository) {}

  async execute(authUserId: string): Promise<CompleteTutorialResult> {
    const employee = await this.repo.findByAuthUserId(authUserId);
    if (!employee) {
      return { success: false, errorMessage: "社員情報が見つかりません" };
    }
    if (employee.tutorialCompletedAt !== undefined) {
      return { success: true };
    }
    await this.repo.completeTutorial(authUserId);
    return { success: true };
  }
}
