import { createContext, useContext, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import { APP_CONFIG } from "../config/env";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [provider, setProvider] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not detected.");
    }

    const browserProvider = new BrowserProvider(window.ethereum);
    const network = await browserProvider.getNetwork();
    if (Number(network.chainId) !== APP_CONFIG.chainId) {
      throw new Error(`Switch MetaMask to chainId ${APP_CONFIG.chainId}.`);
    }

    const accounts = await browserProvider.send("eth_requestAccounts", []);
    setProvider(browserProvider);
    setWalletAddress(accounts[0]);
    return accounts[0];
  };

  const value = useMemo(
    () => ({
      walletAddress,
      provider,
      isConnected: Boolean(walletAddress),
      connectWallet
    }),
    [walletAddress, provider]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return ctx;
}
