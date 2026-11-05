export const paymentStatuses = [
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
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  created: ["pending", "cancelled", "failed"],
  pending: ["detected", "cancelled", "expired", "failed"],
  detected: ["confirming", "confirmed", "underpaid", "overpaid", "reorged", "failed"],
  confirming: ["confirmed", "underpaid", "overpaid", "reorged", "failed"],
  confirmed: ["overpaid", "reorged"],
  underpaid: ["confirming", "confirmed", "overpaid", "expired", "reorged", "failed"],
  overpaid: ["reorged"],
  expired: ["detected"],
  cancelled: ["detected"],
  failed: [],
  reorged: ["detected", "confirming", "failed"]
};

export function canTransitionPayment(
  current: PaymentStatus,
  next: PaymentStatus
): boolean {
  return transitions[current].includes(next);
}

export function transitionPayment(
  current: PaymentStatus,
  next: PaymentStatus
): PaymentStatus {
  if (!canTransitionPayment(current, next)) {
    throw new Error(`Invalid payment state transition: ${current} -> ${next}`);
  }

  return next;
}
