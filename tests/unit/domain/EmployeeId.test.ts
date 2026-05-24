import { describe, expect, it } from "vitest";
import { EmployeeId } from "../../../src/domain/value-objects/EmployeeId";

describe("EmployeeId", () => {
  describe("parse", () => {
    it("9桁の数値文字列を受け付ける", () => {
      const id = EmployeeId.parse("000000001");
      expect(id.value).toBe("000000001");
    });

    it("先頭ゼロを含む9桁を受け付ける", () => {
      const id = EmployeeId.parse("012345678");
      expect(id.value).toBe("012345678");
    });

    it("8桁以下は拒否する", () => {
      expect(() => EmployeeId.parse("12345678")).toThrow();
    });

    it("10桁以上は拒否する", () => {
      expect(() => EmployeeId.parse("1234567890")).toThrow();
    });

    it("数字以外の文字を含む場合は拒否する", () => {
      expect(() => EmployeeId.parse("12345678a")).toThrow();
    });

    it("空文字は拒否する", () => {
      expect(() => EmployeeId.parse("")).toThrow();
    });

    it("string 以外の型は拒否する", () => {
      expect(() => EmployeeId.parse(123456789)).toThrow();
      expect(() => EmployeeId.parse(null)).toThrow();
      expect(() => EmployeeId.parse(undefined)).toThrow();
    });
  });

  describe("equals", () => {
    it("同じ値は等しい", () => {
      const a = EmployeeId.parse("000000001");
      const b = EmployeeId.parse("000000001");
      expect(a.equals(b)).toBe(true);
    });

    it("異なる値は等しくない", () => {
      const a = EmployeeId.parse("000000001");
      const b = EmployeeId.parse("000000002");
      expect(a.equals(b)).toBe(false);
    });
  });

  describe("toString", () => {
    it("元の文字列を返す", () => {
      const id = EmployeeId.parse("100000001");
      expect(id.toString()).toBe("100000001");
    });
  });
});
