export const APP_CONFIG = {
  rpcUrl: import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545",
  chainId: Number(import.meta.env.VITE_CHAIN_ID || 31337),
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || ""
};
