import { describe, expect, it } from "vitest";
import { Position } from "@/src/domain/value-objects/Position";

describe("Position.create", () => {
  it("有効な座標を作成できる", () => {
    const p = Position.create(100, 200);
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
  });

  it("ゼロ座標は有効", () => {
    const p = Position.create(0, 0);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it("小数点座標は有効", () => {
    const p = Position.create(1.5, 2.7);
    expect(p.x).toBe(1.5);
    expect(p.y).toBe(2.7);
  });

  it("x が負の値は無効", () => {
    expect(() => Position.create(-1, 0)).toThrow();
  });

  it("y が負の値は無効", () => {
    expect(() => Position.create(0, -1)).toThrow();
  });

  it("x が文字列は無効", () => {
    expect(() => Position.create("100", 0)).toThrow();
  });

  it("Infinity は無効", () => {
    expect(() => Position.create(Number.POSITIVE_INFINITY, 0)).toThrow();
  });

  it("NaN は無効", () => {
    expect(() => Position.create(Number.NaN, 0)).toThrow();
  });
});

describe("Position.isWithinBounds", () => {
  it("フロア内の座標は true", () => {
    expect(Position.create(500, 400).isWithinBounds(1000, 800)).toBe(true);
  });

  it("境界上の座標は true", () => {
    expect(Position.create(1000, 800).isWithinBounds(1000, 800)).toBe(true);
  });

  it("x がフロア幅を超えると false", () => {
    expect(Position.create(1001, 400).isWithinBounds(1000, 800)).toBe(false);
  });

  it("y がフロア高さを超えると false", () => {
    expect(Position.create(500, 801).isWithinBounds(1000, 800)).toBe(false);
  });
});

describe("Position.distanceTo", () => {
  it("同じ座標の距離は0", () => {
    const p = Position.create(100, 100);
    expect(p.distanceTo(p)).toBe(0);
  });

  it("3-4-5 の直角三角形", () => {
    const a = Position.create(0, 0);
    const b = Position.create(3, 4);
    expect(a.distanceTo(b)).toBe(5);
  });
});

describe("Position.equals", () => {
  it("同じ座標は等しい", () => {
    expect(Position.create(10, 20).equals(Position.create(10, 20))).toBe(true);
  });

  it("異なる座標は等しくない", () => {
    expect(Position.create(10, 20).equals(Position.create(10, 21))).toBe(false);
  });
});
