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
