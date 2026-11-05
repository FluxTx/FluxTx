export function parseUnits(amount: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("Token decimals must be an integer between 0 and 255");
  }

  if (!/^(0|[1-9]\d*)(?:\.(\d+))?$/.test(amount)) {
    throw new TypeError("Amount must be a non-negative decimal string");
  }

  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) {
    throw new RangeError(`Amount has more than ${decimals} decimal places`);
  }

  return BigInt(whole) * 10n ** BigInt(decimals)
    + BigInt(fraction.padEnd(decimals, "0") || "0");
}

export function formatUnits(value: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("Token decimals must be an integer between 0 and 255");
  }

  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(decimals, "0");
  const trimmedFraction = fraction.replace(/0+$/, "");
  const formatted = trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();

  return negative ? `-${formatted}` : formatted;
}
