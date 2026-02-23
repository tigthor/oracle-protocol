"use client";

import { useState, useEffect, useCallback } from "react";

export interface PaperOrder {
  id: string;
  marketId: string;
  side: "yes" | "no";
  type: "market" | "limit";
  price: number;
  size: number;
  status: "pending" | "filled" | "cancelled";
  createdAt: number;
  filledAt?: number;
}

const STORAGE_KEY = "oracle_paper_orders";

function loadOrders(): PaperOrder[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOrders(orders: PaperOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function usePaperTrading() {
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [toast, setToast] = useState<PaperOrder | null>(null);

  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  const placeOrder = useCallback(
    (params: {
      marketId: string;
      side: "yes" | "no";
      type: "market" | "limit";
      price: number;
      size: number;
    }) => {
      const order: PaperOrder = {
        id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...params,
        status: "pending",
        createdAt: Date.now(),
      };

      setOrders((prev) => {
        const next = [order, ...prev];
        saveOrders(next);
        return next;
      });

      // Simulate fill after delay
      const delay = 200 + Math.random() * 600;
      setTimeout(() => {
        setOrders((prev) => {
          const next = prev.map((o) =>
            o.id === order.id
              ? { ...o, status: "filled" as const, filledAt: Date.now() }
              : o
          );
          saveOrders(next);
          return next;
        });
        setToast({ ...order, status: "filled", filledAt: Date.now() });
        setTimeout(() => setToast(null), 3000);
      }, delay);

      return order;
    },
    []
  );

  const cancelOrder = useCallback((orderId: string) => {
    setOrders((prev) => {
      const next = prev.map((o) =>
        o.id === orderId ? { ...o, status: "cancelled" as const } : o
      );
      saveOrders(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setOrders([]);
    saveOrders([]);
  }, []);

  return { orders, toast, placeOrder, cancelOrder, clearHistory };
}
