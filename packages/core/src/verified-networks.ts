const verifiedNetworks = new Set<string>();

export function isNetworkVerified(networkId: string): boolean {
  return verifiedNetworks.has(networkId);
}
