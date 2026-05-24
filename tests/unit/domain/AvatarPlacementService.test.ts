import { describe, expect, it } from "vitest";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import { AvatarPlacementService } from "@/src/domain/services/AvatarPlacementService";
import { Position } from "@/src/domain/value-objects/Position";

const floor = buildFloor(DEFAULT_FLOOR_LAYOUT);
const service = new AvatarPlacementService();

describe("AvatarPlacementService.findInitialPosition", () => {
  it("既存アバターがいない場合は有効な位置を返す", () => {
    const pos = service.findInitialPosition(floor, []);
    expect(floor.containsPosition(pos)).toBe(true);
  });

  it("返された位置はフロア内に収まる", () => {
    const pos = service.findInitialPosition(floor, []);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
    expect(pos.x).toBeLessThanOrEqual(floor.width);
    expect(pos.y).toBeLessThanOrEqual(floor.height);
  });

  it("既存アバターと衝突しない位置を返す", () => {
    const occupied = [Position.create(50, 50)];
    const pos = service.findInitialPosition(floor, occupied);
    const distance = pos.distanceTo(occupied[0]);
    expect(distance).toBeGreaterThanOrEqual(80);
  });

  it("複数の既存アバターがいても配置できる", () => {
    const occupied = [Position.create(50, 50), Position.create(150, 50), Position.create(250, 50)];
    const pos = service.findInitialPosition(floor, occupied);
    for (const o of occupied) {
      expect(pos.distanceTo(o)).toBeGreaterThanOrEqual(80);
    }
  });

  it("フロアが満杯でもフォールバック位置を返す", () => {
    // グリッド全点を埋める
    const occupied: Position[] = [];
    for (let y = 50; y <= floor.height - 50; y += 100) {
      for (let x = 50; x <= floor.width - 50; x += 100) {
        occupied.push(Position.create(x, y));
      }
    }
    const pos = service.findInitialPosition(floor, occupied);
    expect(floor.containsPosition(pos)).toBe(true);
  });
});
