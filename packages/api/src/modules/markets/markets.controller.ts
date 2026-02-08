import { Controller, Get, Param, Query, Logger } from "@nestjs/common";
import { MarketsService } from "./markets.service";

@Controller("markets")
export class MarketsController {
  private readonly logger = new Logger(MarketsController.name);

  constructor(private readonly marketsService: MarketsService) {}

  @Get()
  async getMarkets(
    @Query("category") category?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const result = await this.marketsService.getAll({
      category, status, search, sortBy,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    return { success: true, data: result.markets, total: result.total, timestamp: Date.now() };
  }

  @Get("leaderboard")
  async getLeaderboard(@Query("period") period?: string) {
    const data = this.marketsService.getLeaderboard(period || "7d");
    return { success: true, data, timestamp: Date.now() };
  }

  @Get(":id")
  async getMarket(@Param("id") id: string) {
    const market = await this.marketsService.getById(id);
    if (!market) {
      return { success: false, error: "Market not found", timestamp: Date.now() };
    }
    return { success: true, data: market, timestamp: Date.now() };
  }

  @Get(":id/orderbook")
  async getOrderBook(@Param("id") id: string) {
    const market = await this.marketsService.getById(id);
    if (!market || !market.outcomeAssetId) {
      return { success: false, error: "Market not found or no on-chain asset", timestamp: Date.now() };
    }
    const orderbook = await this.marketsService.getOrderBook(market.outcomeAssetId);
    return { success: true, data: orderbook, timestamp: Date.now() };
  }

  @Get(":id/trades")
  async getTrades(@Param("id") id: string, @Query("limit") limit?: string) {
    const market = await this.marketsService.getById(id);
    if (!market || !market.outcomeAssetId) {
      return { success: false, data: [], timestamp: Date.now() };
    }
    const trades = await this.marketsService.getRecentTrades(market.outcomeAssetId);
    return { success: true, data: trades.slice(0, parseInt(limit || "50")), timestamp: Date.now() };
  }

  @Get(":id/candles")
  async getCandles(@Param("id") id: string, @Query("interval") interval?: string) {
    const market = await this.marketsService.getById(id);
    if (!market || !market.outcomeAssetId) {
      return { success: true, data: [], timestamp: Date.now() };
    }
    const candles = await this.marketsService.getCandles(market.outcomeAssetId, interval || "1h");
    return { success: true, data: candles, timestamp: Date.now() };
  }

  @Get("prices/all")
  async getAllPrices() {
    const prices = await this.marketsService.getAllPrices();
    return { success: true, data: prices, timestamp: Date.now() };
  }

  @Get("user/:address/positions")
  async getUserPositions(@Param("address") address: string) {
    const positions = await this.marketsService.getUserPositions(address);
    return { success: true, data: positions, timestamp: Date.now() };
  }

  @Get("user/:address/balance")
  async getUserBalance(@Param("address") address: string) {
    const balance = await this.marketsService.getUserBalance(address);
    return { success: true, data: balance, timestamp: Date.now() };
  }
}
