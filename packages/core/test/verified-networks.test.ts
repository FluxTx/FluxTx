import { describe, expect, it } from "vitest";
import { isNetworkVerified } from "../src/verified-networks.js";

describe("verified network capabilities", () => {
  it("does not enable a chain based on its name or configuration alone", () => {
    for (const id of [
      "ethereum",
      "base",
      "solana",
      "tron",
      "test-simulator",
      "unknown"
    ]) {
      expect(isNetworkVerified(id)).toBe(false);
    }
  });
});
