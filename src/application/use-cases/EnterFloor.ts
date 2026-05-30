import type { Floor } from "@/src/domain/entities/Floor";
import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import type { PresenceGateway, PresenceHandlers } from "@/src/domain/ports/PresenceGateway";
import { AvatarPlacementService } from "@/src/domain/services/AvatarPlacementService";
import type { Position } from "@/src/domain/value-objects/Position";

export type EnterFloorInput = {
  authUserId: string;
  floor: Floor;
  occupiedPositions: ReadonlyArray<Position>;
  handlers: PresenceHandlers;
};

export type EnterFloorResult =
  | { success: true; position: Position }
  | { success: false; errorMessage: string };

export class EnterFloor {
  private readonly placementService = new AvatarPlacementService();

  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly presenceGateway: PresenceGateway
  ) {}

  async execute(input: EnterFloorInput): Promise<EnterFloorResult> {
    const employee = await this.employeeRepository.findByAuthUserId(input.authUserId);
    if (!employee?.isActive) {
      return { success: false, errorMessage: "アカウントが無効です" };
    }

    const position = this.placementService.findInitialPosition(
      input.floor,
      input.occupiedPositions
    );

    await this.presenceGateway.join(
      {
        employeeId: employee.employeeId.value,
        displayName: employee.displayName,
        avatarUrl: employee.avatarUrl,
        x: position.x,
        y: position.y,
        status: "available",
      },
      input.handlers
    );

    return { success: true, position };
  }
}
