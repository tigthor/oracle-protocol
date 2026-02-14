"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  createElement,
} from "react";

const STORAGE_KEY = "oracle_wallet_address";
const DEMO_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  connect: (addr: string) => void;
  connectDemo: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  isConnected: false,
  connect: () => {},
  connectDemo: () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setAddress(stored);
  }, []);

  const connect = useCallback((addr: string) => {
    const trimmed = addr.trim();
    if (!trimmed.startsWith("0x") || trimmed.length < 10) return;
    setAddress(trimmed);
    localStorage.setItem(STORAGE_KEY, trimmed);
  }, []);

  const connectDemo = useCallback(() => {
    setAddress(DEMO_ADDRESS);
    localStorage.setItem(STORAGE_KEY, DEMO_ADDRESS);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return createElement(
    WalletContext.Provider,
    {
      value: {
        address,
        isConnected: !!address,
        connect,
        connectDemo,
        disconnect,
      },
    },
    children
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

export function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
