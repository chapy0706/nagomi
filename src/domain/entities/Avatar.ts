import type { DisplayName } from "@/src/domain/value-objects/DisplayName";
import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";
import type { Position } from "@/src/domain/value-objects/Position";

export class Avatar {
  private constructor(
    readonly employeeId: EmployeeId,
    readonly displayName: DisplayName,
    readonly position: Position,
    readonly avatarUrl: string | undefined
  ) {}

  static create(
    employeeId: EmployeeId,
    displayName: DisplayName,
    position: Position,
    avatarUrl: string | undefined
  ): Avatar {
    return new Avatar(employeeId, displayName, position, avatarUrl);
  }

  withPosition(position: Position): Avatar {
    return new Avatar(this.employeeId, this.displayName, position, this.avatarUrl);
  }
}
