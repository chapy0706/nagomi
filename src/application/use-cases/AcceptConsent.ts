import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";

export type AcceptConsentInput = {
  authUserId: string;
  agreed: boolean;
};

export type AcceptConsentResult = { success: true } | { success: false; errorMessage: string };

export class AcceptConsent {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(input: AcceptConsentInput): Promise<AcceptConsentResult> {
    if (!input.agreed) {
      return { success: false, errorMessage: "利用規約とプライバシーポリシーへの同意が必要です" };
    }

    const employee = await this.employeeRepository.findByAuthUserId(input.authUserId);
    if (!employee?.isActive) {
      return { success: false, errorMessage: "アカウントが無効です" };
    }

    if (employee.consentAcceptedAt !== undefined) {
      return { success: true };
    }

    await this.employeeRepository.recordConsent(employee.employeeId);
    return { success: true };
  }
}
