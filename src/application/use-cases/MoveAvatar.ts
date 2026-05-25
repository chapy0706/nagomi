import type { Floor } from "@/src/domain/entities/Floor";
import type { PresenceGateway } from "@/src/domain/ports/PresenceGateway";
import { Position } from "@/src/domain/value-objects/Position";

export type MoveAvatarInput = {
  floor: Floor;
  x: number;
  y: number;
};

export type MoveAvatarResult =
  | { success: true; position: Position }
  | { success: false; errorMessage: string };

export class MoveAvatar {
  constructor(private readonly presenceGateway: PresenceGateway) {}

  async execute(input: MoveAvatarInput): Promise<MoveAvatarResult> {
    let position: Position;
    try {
      position = Position.create(input.x, input.y);
    } catch (e) {
      return {
        success: false,
        errorMessage: e instanceof Error ? e.message : "座標が不正です",
      };
    }

    if (!input.floor.containsPosition(position)) {
      return { success: false, errorMessage: "フロアの範囲外です" };
    }

    await this.presenceGateway.updatePosition(position.x, position.y);
    return { success: true, position };
  }
}
