"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const WS_URL =
  process.env.NEXT_PUBLIC_ORACLE_WS_URL || "http://localhost:4000";

interface OracleWsState {
  prices: Record<string, number>;
  isConnected: boolean;
}

let globalSocket: Socket | null = null;
let refCount = 0;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 20,
    });
  }
  refCount++;
  return globalSocket;
}

function releaseSocket() {
  refCount--;
  if (refCount <= 0 && globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
    refCount = 0;
  }
}

export function useOracleWs() {
  const [isConnected, setIsConnected] = useState(false);
  const pricesRef = useRef<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("prices", (msg: any) => {
      if (msg?.data) {
        const parsed: Record<string, number> = {};
        for (const [k, v] of Object.entries(msg.data)) {
          parsed[k] = typeof v === "string" ? parseFloat(v) : (v as number);
        }
        pricesRef.current = parsed;
        setPrices(parsed);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("prices");
      releaseSocket();
    };
  }, []);

  const subscribeMarket = useCallback((marketId: string) => {
    socketRef.current?.emit("subscribe:market", { marketId });
  }, []);

  const subscribeOrderbook = useCallback((coin: string) => {
    socketRef.current?.emit("subscribe:orderbook", { coin });
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    socketRef.current?.emit("unsubscribe", { channel });
  }, []);

  return {
    prices,
    isConnected,
    subscribeMarket,
    subscribeOrderbook,
    unsubscribe,
    socket: socketRef.current,
  };
}
