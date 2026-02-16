"use client";

import { useState, useEffect, useRef } from "react";
import { getAllPrices } from "@/lib/api";
import { useOracleWs } from "./use-oracle-ws";

const HL_WS =
  process.env.NEXT_PUBLIC_HL_WS_URL ||
  "wss://api.hyperliquid-testnet.xyz/ws";

export function usePrices() {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const { prices: wsPrices, isConnected } = useOracleWs();
  const wsRef = useRef<WebSocket | null>(null);

  // Seed from REST
  useEffect(() => {
    getAllPrices().then(setPrices).catch(() => {});
  }, []);

  // Apply Oracle WS prices when available
  useEffect(() => {
    if (isConnected && Object.keys(wsPrices).length > 0) {
      const stringPrices: Record<string, string> = {};
      for (const [k, v] of Object.entries(wsPrices)) {
        stringPrices[k] = String(v);
      }
      setPrices(stringPrices);
    }
  }, [wsPrices, isConnected]);

  // Fallback: direct HL WebSocket if Oracle WS is not connected
  useEffect(() => {
    if (isConnected) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(HL_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            method: "subscribe",
            subscription: { type: "allMids" },
          })
        );
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.channel === "allMids" && msg.data?.mids) {
            setPrices(msg.data.mids);
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch {}

    return () => {
      if (ws) ws.close();
    };
  }, [isConnected]);

  return prices;
}
