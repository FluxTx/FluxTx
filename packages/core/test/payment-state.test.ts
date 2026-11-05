import { describe, expect, it } from "vitest";
import {
  canTransitionPayment,
  transitionPayment,
  type PaymentStatus
} from "../src/payment-state.js";

describe("payment state transitions", () => {
  it.each([
    ["created", "pending"],
    ["pending", "detected"],
    ["detected", "confirming"],
    ["confirming", "confirmed"],
    ["confirmed", "reorged"],
    ["confirmed", "overpaid"],
    ["underpaid", "overpaid"],
    ["expired", "detected"]
  ] as const)("allows %s -> %s", (current, next) => {
    expect(canTransitionPayment(current, next)).toBe(true);
    expect(transitionPayment(current, next)).toBe(next);
  });

  it.each([
    ["created", "confirmed"],
    ["confirmed", "pending"],
    ["failed", "detected"]
  ] as const)("rejects %s -> %s", (current, next) => {
    expect(canTransitionPayment(current, next)).toBe(false);
    expect(() => transitionPayment(current, next)).toThrow(
      `Invalid payment state transition: ${current} -> ${next}`
    );
  });

  it("keeps the complete status set explicit", () => {
    const statuses: PaymentStatus[] = [
      "created",
      "pending",
      "detected",
      "confirming",
      "confirmed",
      "underpaid",
      "overpaid",
      "expired",
      "cancelled",
      "failed",
      "reorged"
    ];

    expect(statuses).toHaveLength(11);
  });
});
