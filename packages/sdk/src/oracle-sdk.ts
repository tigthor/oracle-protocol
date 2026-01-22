import { EventEmitter } from "eventemitter3";
import { HyperliquidClient, HLAssetCtx, HLBookLevel } from "./hyperliquid-client";
import {
  Market,
  MarketStatus,
  MarketCategory,
  OrderBook,
  OrderBookLevel,
  Position,
  Trade,
  OrderSide,
  OracleConfig,
  TESTNET_CONFIG,
  WsEventType,
} from "./types";

// ═══════════════════════════════════════════════════════
// Oracle SDK — Prediction Market Client
// Wraps Hyperliquid with market-level abstractions
// ═══════════════════════════════════════════════════════

export class OracleSDK extends EventEmitter {
  public hl: HyperliquidClient;
  private config: OracleConfig;
  private markets: Map<string, Market> = new Map();
  private priceCache: Map<string, number> = new Map();

  constructor(config: OracleConfig = TESTNET_CONFIG) {
    super();
    this.config = config;
    this.hl = new HyperliquidClient(config);
  }

  // ── Initialization ──

  async initialize(): Promise<void> {
    console.log(
      `[Oracle] Initializing ${this.config.isTestnet ? "TESTNET" : "MAINNET"}...`
    );

    // Fetch all available assets and identify outcome contracts
    const [meta, assetCtxs] = await this.hl.getMetaAndAssetCtxs();

    meta.universe.forEach((asset, idx) => {
      const ctx = assetCtxs[idx];
      // Map all assets — in production, filter for outcome-type only
      this.priceCache.set(asset.name, parseFloat(ctx.midPx || "0"));
    });

    console.log(
      `[Oracle] Loaded ${meta.universe.length} assets from Hyperliquid`
    );

    // Connect WebSocket for real-time updates
    try {
      await this.hl.connectWs();
      this.setupWsListeners();
      console.log("[Oracle] WebSocket connected");
    } catch (err) {
      console.warn("[Oracle] WebSocket connection failed, using REST polling");
      this.startPolling();
    }
  }
}
