"use client";

import { useState, useEffect, useCallback } from "react";
import { getMarkets, getMarket, getOrderBook, getTrades, getCandles } from "@/lib/api";
import type { Market, OrderBook, Trade, Candle } from "@/lib/api";

export function useMarkets(params?: {
  category?: string;
  search?: string;
  sortBy?: string;
}) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await getMarkets({
        ...params,
        status: "active",
        limit: 200,
      });
      setMarkets(res.data);
      setTotal(res.total);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params?.category, params?.search, params?.sortBy]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 8000);
    return () => clearInterval(iv);
  }, [refresh]);

  return { markets, total, loading, error, refresh };
}

export function useMarketDetail(id: string | null) {
  const [market, setMarket] = useState<Market | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [m, ob, t, c] = await Promise.allSettled([
        getMarket(id),
        getOrderBook(id),
        getTrades(id, 50),
        getCandles(id),
      ]);
      if (m.status === "fulfilled") setMarket(m.value);
      if (ob.status === "fulfilled") setOrderBook(ob.value);
      if (t.status === "fulfilled") setTrades(t.value);
      if (c.status === "fulfilled") setCandles(c.value);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
    const iv = setInterval(loadAll, 5000);
    return () => clearInterval(iv);
  }, [loadAll]);

  return { market, orderBook, trades, candles, loading, refresh: loadAll };
}
