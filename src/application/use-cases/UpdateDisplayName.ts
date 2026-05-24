import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { DisplayName } from "@/src/domain/value-objects/DisplayName";

export type UpdateDisplayNameInput = {
  authUserId: string;
  newDisplayName: unknown;
};

export type UpdateDisplayNameResult = { success: true } | { success: false; errorMessage: string };

export class UpdateDisplayName {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(input: UpdateDisplayNameInput): Promise<UpdateDisplayNameResult> {
    const employee = await this.employeeRepository.findByAuthUserId(input.authUserId);
    if (!employee?.isActive) {
      return { success: false, errorMessage: "アカウントが無効です" };
    }

    let displayName: DisplayName;
    try {
      displayName = DisplayName.parse(input.newDisplayName);
    } catch (e) {
      const message = e instanceof Error ? e.message : "表示名が無効です";
      return { success: false, errorMessage: message };
    }

    await this.employeeRepository.updateDisplayName(employee.employeeId, displayName);
    return { success: true };
  }
}
