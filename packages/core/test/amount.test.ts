import { describe, expect, it } from "vitest";
import { formatUnits, parseUnits } from "../src/amount.js";

describe("parseUnits", () => {
  it("converts decimal strings without floating-point arithmetic", () => {
    expect(parseUnits("25.000001", 6)).toBe(25_000_001n);
    expect(parseUnits("0.1", 18)).toBe(100_000_000_000_000_000n);
    expect(parseUnits("9", 0)).toBe(9n);
  });

  it.each(["", "-1", "+1", "01", "1e3", "1.2.3", " 1"])(
    "rejects invalid amount %j",
    (amount) => {
      expect(() => parseUnits(amount, 6)).toThrow();
    }
  );

  it("rejects amounts with excess precision and invalid token decimals", () => {
    expect(() => parseUnits("1.001", 2)).toThrow(RangeError);
    expect(() => parseUnits("1", -1)).toThrow(RangeError);
    expect(() => parseUnits("1", 1.5)).toThrow(RangeError);
  });
});

describe("formatUnits", () => {
  it("formats raw units without unnecessary trailing zeroes", () => {
    expect(formatUnits(25_000_000n, 6)).toBe("25");
    expect(formatUnits(25_010_000n, 6)).toBe("25.01");
    expect(formatUnits(-123n, 2)).toBe("-1.23");
  });
});
