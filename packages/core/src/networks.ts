export type SupportStatus =
  | "SUPPORTED"
  | "BETA"
  | "IN_PROGRESS"
  | "PLANNED"
  | "UNSUPPORTED";

export type Network = {
  id: string;
  name: string;
  family: "evm" | "tron" | "solana" | "bitcoin" | "test-simulator";
  status: SupportStatus;
};

export const networks: readonly Network[] = [
  { id: "ethereum", name: "Ethereum", family: "evm", status: "PLANNED" },
  { id: "bnb-smart-chain", name: "BNB Smart Chain", family: "evm", status: "PLANNED" },
  { id: "polygon", name: "Polygon", family: "evm", status: "PLANNED" },
  { id: "arbitrum", name: "Arbitrum", family: "evm", status: "PLANNED" },
  { id: "optimism", name: "Optimism", family: "evm", status: "PLANNED" },
  { id: "base", name: "Base", family: "evm", status: "PLANNED" },
  { id: "avalanche-c-chain", name: "Avalanche C-Chain", family: "evm", status: "PLANNED" },
  { id: "tron", name: "TRON", family: "tron", status: "PLANNED" },
  { id: "solana", name: "Solana", family: "solana", status: "PLANNED" },
  { id: "bitcoin", name: "Bitcoin", family: "bitcoin", status: "PLANNED" }
];
