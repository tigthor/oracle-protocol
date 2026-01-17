import { z } from "zod";

export enum MarketStatus {
  PENDING = "pending",
  ACTIVE = "active",
  PAUSED = "paused",
  RESOLVED = "resolved",
  DISPUTED = "disputed",
  CANCELLED = "cancelled",
}

export enum MarketCategory {
  CRYPTO = "crypto",
  MACRO = "macro",
  SPORTS = "sports",
  TECH = "tech",
  POLITICS = "politics",
  CUSTOM = "custom",
}

export enum OrderSide {
  YES = "yes",
  NO = "no",
}

export enum OrderType {
  MARKET = "market",
  LIMIT = "limit",
}

export enum OrderStatus {
  PENDING = "pending",
  OPEN = "open",
  FILLED = "filled",
  PARTIALLY_FILLED = "partially_filled",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}
