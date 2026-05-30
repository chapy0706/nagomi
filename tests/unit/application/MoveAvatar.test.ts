import { describe, expect, it, vi } from "vitest";
import { MoveAvatar } from "@/src/application/use-cases/MoveAvatar";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import type { PresenceGateway } from "@/src/domain/ports/PresenceGateway";

const floor = buildFloor(DEFAULT_FLOOR_LAYOUT);

function makeFakeGateway() {
  const updates: { x: number; y: number }[] = [];
  const gateway: PresenceGateway = {
    join: vi.fn(async () => {}),
    updatePosition: vi.fn(async (x, y) => {
      updates.push({ x, y });
    }),
    updateStatus: vi.fn(async () => {}),
    leave: vi.fn(async () => {}),
  };
  return { gateway, updates };
}

describe("MoveAvatar", () => {
  it("有効な座標で presence に位置を送信し成功を返す", async () => {
    const { gateway, updates } = makeFakeGateway();
    const useCase = new MoveAvatar(gateway);
    const result = await useCase.execute({ floor, x: 200, y: 300 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.position.x).toBe(200);
      expect(result.position.y).toBe(300);
    }
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({ x: 200, y: 300 });
  });

  it("フロア境界外の座標は失敗を返しgatewayを呼ばない", async () => {
    const { gateway, updates } = makeFakeGateway();
    const useCase = new MoveAvatar(gateway);
    const result = await useCase.execute({ floor, x: floor.width + 1, y: 100 });

    expect(result.success).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it("負の座標は失敗を返しgatewayを呼ばない", async () => {
    const { gateway, updates } = makeFakeGateway();
    const useCase = new MoveAvatar(gateway);
    const result = await useCase.execute({ floor, x: -10, y: 100 });

    expect(result.success).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it("フロア境界ちょうどの座標は成功する", async () => {
    const { gateway } = makeFakeGateway();
    const useCase = new MoveAvatar(gateway);
    const result = await useCase.execute({ floor, x: floor.width, y: floor.height });

    expect(result.success).toBe(true);
  });

  it("NaN の座標は失敗を返す", async () => {
    const { gateway, updates } = makeFakeGateway();
    const useCase = new MoveAvatar(gateway);
    const result = await useCase.execute({ floor, x: Number.NaN, y: 100 });

    expect(result.success).toBe(false);
    expect(updates).toHaveLength(0);
  });
});
