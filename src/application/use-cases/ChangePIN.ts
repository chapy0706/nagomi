import type { AuthGateway } from "@/src/domain/ports/AuthGateway";
import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { Pin } from "@/src/domain/value-objects/Pin";

export type ChangePINInput = {
  authUserId: string;
  currentPin: string;
  newPin: unknown;
  confirmPin: unknown;
};

export type ChangePINResult = { success: true } | { success: false; errorMessage: string };

export class ChangePIN {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly employeeRepository: EmployeeRepository
  ) {}

  async execute(input: ChangePINInput): Promise<ChangePINResult> {
    if (input.newPin !== input.confirmPin) {
      return { success: false, errorMessage: "新しいPINが一致しません" };
    }

    let newPin: Pin;
    try {
      newPin = Pin.parse(input.newPin);
    } catch {
      return { success: false, errorMessage: "PINは6桁以上の数字を入力してください" };
    }

    const employee = await this.employeeRepository.findByAuthUserId(input.authUserId);
    if (!employee?.isActive) {
      return { success: false, errorMessage: "アカウントが無効です" };
    }

    const verifyResult = await this.authGateway.signIn(employee.employeeId, input.currentPin);
    if (!verifyResult.success) {
      return { success: false, errorMessage: "現在のPINが正しくありません" };
    }

    await this.authGateway.updatePassword(newPin);
    return { success: true };
  }
}
