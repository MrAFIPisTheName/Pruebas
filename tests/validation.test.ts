import { describe, expect, it } from "vitest";
import { parseQuantity } from "../src/utils/validation";

describe("parseQuantity", () => {
  it("rejects empty", () => expect(parseQuantity("")).toBeNull());
  it("rejects negative", () => expect(parseQuantity("-2")).toBeNull());
  it("rejects decimal", () => expect(parseQuantity("2.5")).toBeNull());
  it("accepts positive integer", () => expect(parseQuantity("12")).toBe(12));
  it("accepts comma input only when integer", () => expect(parseQuantity("12,0")).toBe(12));
  it("rejects comma input when not integer", () => expect(parseQuantity("12,5")).toBeNull());
  it("rejects zero by default", () => expect(parseQuantity("0")).toBeNull());
  it("accepts zero when allowZero is true", () => expect(parseQuantity("0", { allowZero: true })).toBe(0));
  it("still rejects negative when allowZero is true", () => expect(parseQuantity("-1", { allowZero: true })).toBeNull());
});