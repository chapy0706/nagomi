import { describe, expect, it } from "vitest";
import { RoomCapacity } from "@/src/domain/value-objects/RoomCapacity";

describe("RoomCapacity.of", () => {
  it("有効な定員を作成できる", () => {
    const c = RoomCapacity.of(2, 3);
    expect(c.min).toBe(2);
    expect(c.max).toBe(3);
  });

  it("min === max は有効", () => {
    const c = RoomCapacity.of(5, 5);
    expect(c.min).toBe(5);
    expect(c.max).toBe(5);
  });

  it("min が 0 は無効", () => {
    expect(() => RoomCapacity.of(0, 3)).toThrow();
  });

  it("max が min 未満は無効", () => {
    expect(() => RoomCapacity.of(3, 2)).toThrow();
  });

  it("小数は無効", () => {
    expect(() => RoomCapacity.of(1.5, 3)).toThrow();
  });
});

describe("RoomCapacity.canAccept", () => {
  it("現在人数が max 未満なら true", () => {
    expect(RoomCapacity.of(2, 3).canAccept(2)).toBe(true);
  });

  it("現在人数が max と等しければ false", () => {
    expect(RoomCapacity.of(2, 3).canAccept(3)).toBe(false);
  });

  it("現在人数が max を超えたら false", () => {
    expect(RoomCapacity.of(2, 3).canAccept(4)).toBe(false);
  });

  it("0人でも受け入れ可能", () => {
    expect(RoomCapacity.of(1, 5).canAccept(0)).toBe(true);
  });
});

describe("RoomCapacity.isFull", () => {
  it("定員に達したら true", () => {
    expect(RoomCapacity.of(2, 3).isFull(3)).toBe(true);
  });

  it("定員未満なら false", () => {
    expect(RoomCapacity.of(2, 3).isFull(2)).toBe(false);
  });
});
