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

  @Get(":id")
  async getMarket(@Param("id") id: string) {
    const market = await this.marketsService.getById(id);
    if (!market) {
      return { success: false, error: "Market not found", timestamp: Date.now() };
    }
    return { success: true, data: market, timestamp: Date.now() };
  }
}
