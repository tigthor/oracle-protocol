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

  // ── Market Operations ──

  async getMarkets(): Promise<Market[]> {
    const [meta, assetCtxs] = await this.hl.getMetaAndAssetCtxs();
    const allMids = await this.hl.getAllMids();

    const markets: Market[] = meta.universe.map((asset, idx) => {
      const ctx = assetCtxs[idx];
      const midPx = parseFloat(allMids[asset.name] || ctx.midPx || "0");
      const yesPrice = Math.min(Math.max(midPx > 1 ? 0.5 : midPx, 0.01), 0.99);

      const market: Market = {
        id: `hl-${asset.name}`,
        question: this.generateQuestion(asset.name),
        description: `Outcome market for ${asset.name} on Hyperliquid`,
        category: this.categorizeAsset(asset.name),
        status: MarketStatus.ACTIVE,
        createdAt: Date.now() - 86400000 * 7,
        expiresAt: Date.now() + 86400000 * 30,
        resolutionSource: "hypercore_mark_price",
        outcomeAssetId: asset.name,
        yesPrice,
        noPrice: 1 - yesPrice,
        volume24h: parseFloat(ctx.dayNtlVlm || "0"),
        totalVolume: parseFloat(ctx.dayNtlVlm || "0") * 30,
        liquidity: parseFloat(ctx.openInterest || "0"),
        resolution: null,
        tags: [asset.name.toLowerCase()],
      };

      this.markets.set(market.id, market);
      return market;
    });

    return markets;
  }

  async getMarket(marketId: string): Promise<Market | null> {
    if (this.markets.has(marketId)) {
      return this.markets.get(marketId)!;
    }
    await this.getMarkets();
    return this.markets.get(marketId) || null;
  }

  private generateQuestion(assetName: string): string {
    const templates: Record<string, string> = {
      BTC: "Will BTC be above $100,000 at expiry?",
      ETH: "Will ETH be above $4,000 at expiry?",
      SOL: "Will SOL be above $200 at expiry?",
      HYPE: "Will HYPE be above $50 at expiry?",
    };
    return templates[assetName] || `Will ${assetName} be above current price at expiry?`;
  }

  private categorizeAsset(name: string): MarketCategory {
    const crypto = ["BTC", "ETH", "SOL", "HYPE", "AVAX", "DOGE", "ARB"];
    if (crypto.includes(name)) return MarketCategory.CRYPTO;
    return MarketCategory.CUSTOM;
  }

  async getOrderBook(coin: string): Promise<OrderBook> {
    const book = await this.hl.getL2Book(coin);
    const mapLevel = (levels: HLBookLevel[], running: number = 0): OrderBookLevel[] =>
      levels.map((l) => {
        running += parseFloat(l.sz);
        return { price: parseFloat(l.px), size: parseFloat(l.sz), total: running, orders: l.n };
      });

    const bids = mapLevel(book.levels[0]);
    const asks = mapLevel(book.levels[1]);
    const bestBid = bids.length > 0 ? bids[0].price : 0;
    const bestAsk = asks.length > 0 ? asks[0].price : 1;

    return {
      marketId: `hl-${coin}`,
      bids, asks,
      spread: bestAsk - bestBid,
      midPrice: (bestBid + bestAsk) / 2,
      lastUpdate: book.time || Date.now(),
    };
  }

  async getRecentTrades(coin: string): Promise<Trade[]> {
    const hlTrades = await this.hl.getRecentTrades(coin);
    return hlTrades.map((t) => ({
      id: t.hash, marketId: `hl-${coin}`,
      side: t.side === "B" ? OrderSide.YES : OrderSide.NO,
      price: parseFloat(t.px), size: parseFloat(t.sz),
      timestamp: t.time, maker: "", taker: "", txHash: t.hash,
    }));
  }

  async getUserPositions(address: string): Promise<Position[]> {
    const state = await this.hl.getUserState(address);
    return state.assetPositions
      .filter((p) => parseFloat(p.position.szi) !== 0)
      .map((p) => {
        const size = parseFloat(p.position.szi);
        const entryPx = parseFloat(p.position.entryPx || "0");
        const markPx = this.priceCache.get(p.position.coin) || entryPx;
        return {
          marketId: `hl-${p.position.coin}`,
          market: this.markets.get(`hl-${p.position.coin}`) || ({} as Market),
          side: size > 0 ? OrderSide.YES : OrderSide.NO,
          size: Math.abs(size), avgEntryPrice: entryPx, currentPrice: markPx,
          unrealizedPnl: parseFloat(p.position.unrealizedPnl || "0"),
          realizedPnl: 0, maxPayout: Math.abs(size),
        };
      });
  }

  async getUserBalance(address: string): Promise<{ accountValue: number; withdrawable: number; totalMarginUsed: number; positions: number }> {
    const state = await this.hl.getUserState(address);
    return {
      accountValue: parseFloat(state.crossMarginSummary.accountValue),
      withdrawable: parseFloat(state.withdrawable),
      totalMarginUsed: parseFloat(state.crossMarginSummary.totalMarginUsed),
      positions: state.assetPositions.filter((p) => parseFloat(p.position.szi) !== 0).length,
    };
  }

  async getCandles(coin: string, interval: string = "1h", lookbackMs: number = 86400000 * 7): Promise<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> {
    const now = Date.now();
    const candles = await this.hl.getCandleSnapshot(coin, interval, now - lookbackMs, now);
    return candles.map((c: any) => ({
      time: c.t, open: parseFloat(c.o), high: parseFloat(c.h),
      low: parseFloat(c.l), close: parseFloat(c.c), volume: parseFloat(c.v),
    }));
  }

  subscribeMarket(coin: string): void {
    this.hl.subscribeL2Book(coin, (data) => this.emit(WsEventType.ORDERBOOK_DELTA, { coin, ...data }));
    this.hl.subscribeTrades(coin, (data) => this.emit(WsEventType.TRADE, { coin, trades: data }));
  }

  subscribePrices(): void {
    this.hl.subscribeAllMids((data) => {
      Object.entries(data.mids || {}).forEach(([coin, px]) => this.priceCache.set(coin, parseFloat(px as string)));
      this.emit(WsEventType.PRICE_TICK, data);
    });
  }
}
