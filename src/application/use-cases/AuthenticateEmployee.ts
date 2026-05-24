import type { AuthGateway } from "@/src/domain/ports/AuthGateway";
import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

export type AuthenticateEmployeeInput = {
  rawEmployeeId: unknown;
  pin: string;
};

export type AuthenticateEmployeeResult =
  | { success: true; authUserId: string }
  | { success: false; errorMessage: string };

export class AuthenticateEmployee {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly employeeRepository: EmployeeRepository
  ) {}

  async execute(input: AuthenticateEmployeeInput): Promise<AuthenticateEmployeeResult> {
    const GENERIC_ERROR = "社員IDまたはPINが正しくありません";

    let employeeId: EmployeeId;
    try {
      employeeId = EmployeeId.parse(input.rawEmployeeId);
    } catch {
      return { success: false, errorMessage: GENERIC_ERROR };
    }

    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee?.isActive) {
      return { success: false, errorMessage: GENERIC_ERROR };
    }

    const result = await this.authGateway.signIn(employeeId, input.pin);
    if (!result.success) {
      return { success: false, errorMessage: GENERIC_ERROR };
    }

    return { success: true, authUserId: result.authUserId };
  }
}
