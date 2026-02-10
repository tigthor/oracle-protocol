import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MarketsService } from "../markets/markets.service";

interface OracleSource {
  name: string;
  weight: number;
  fetch: (marketId: string, criteria: string) => Promise<OracleResult>;
}

interface OracleResult {
  source: string;
  outcome: boolean;
  confidence: number;
  rawData: any;
  timestamp: number;
}

@Injectable()
export class ResolutionService {
  private readonly logger = new Logger(ResolutionService.name);
  private oracleSources: OracleSource[];
  private pendingResolutions: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly marketsService: MarketsService) {
    this.oracleSources = [
      { name: "hypercore_mark", weight: 3, fetch: this.queryHyperCoreMark.bind(this) },
      { name: "chainlink_feed", weight: 3, fetch: this.queryChainlinkFeed.bind(this) },
      { name: "pyth_network",   weight: 2, fetch: this.queryPythNetwork.bind(this) },
      { name: "coingecko_api",  weight: 1, fetch: this.queryCoinGecko.bind(this) },
    ];
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkExpiredMarkets(): Promise<void> {
    const { markets } = await this.marketsService.getAll({ status: "active" });
    const now = Date.now();
    for (const market of markets) {
      if (market.expiresAt <= now && !this.pendingResolutions.has(market.id)) {
        this.logger.log(`Market ${market.id} has expired, initiating resolution`);
        this.initiateResolution(market.id);
      }
    }
  }

  async initiateResolution(marketId: string): Promise<void> {
    const market = await this.marketsService.getById(marketId);
    if (!market) return;

    this.logger.log(`Resolving market: ${market.question}`);

    const results: OracleResult[] = [];
    for (const source of this.oracleSources) {
      try {
        const result = await source.fetch(marketId, market.resolutionSource);
        results.push(result);
        this.logger.debug(`Oracle ${source.name}: outcome=${result.outcome}, confidence=${result.confidence}`);
      } catch (err) {
        this.logger.warn(`Oracle ${source.name} failed for ${marketId}: ${err}`);
      }
    }

    if (results.length < 2) {
      this.logger.warn(`Insufficient oracle responses for ${marketId}, delaying...`);
      const timeout = setTimeout(() => {
        this.pendingResolutions.delete(marketId);
        this.initiateResolution(marketId);
      }, 300000);
      this.pendingResolutions.set(marketId, timeout);
      return;
    }

    const totalWeight = this.oracleSources
      .filter((s) => results.some((r) => r.source === s.name))
      .reduce((sum, s) => sum + s.weight, 0);

    let yesWeight = 0;
    for (const result of results) {
      const source = this.oracleSources.find((s) => s.name === result.source);
      if (source && result.outcome) {
        yesWeight += source.weight;
      }
    }

    const outcome = yesWeight > totalWeight / 2 ? 1 : 0;
    const confidence = Math.abs(yesWeight - totalWeight / 2) / (totalWeight / 2);

    this.logger.log(`Market ${marketId} resolved: ${outcome === 1 ? "YES" : "NO"} (confidence: ${(confidence * 100).toFixed(1)}%)`);

    this.pendingResolutions.delete(marketId);
  }

  private async queryHyperCoreMark(marketId: string, criteria: string): Promise<OracleResult> {
    const prices = await this.marketsService.getAllPrices();
    const market = await this.marketsService.getById(marketId);
    if (!market?.outcomeAssetId || !prices[market.outcomeAssetId]) {
      throw new Error("No HyperCore price available");
    }
    const markPrice = parseFloat(prices[market.outcomeAssetId]);
    return {
      source: "hypercore_mark",
      outcome: this.evaluateCriteria(markPrice, criteria),
      confidence: 0.95,
      rawData: { markPrice, coin: market.outcomeAssetId },
      timestamp: Date.now(),
    };
  }

  private async queryChainlinkFeed(marketId: string, criteria: string): Promise<OracleResult> {
    return { source: "chainlink_feed", outcome: Math.random() > 0.5, confidence: 0.9, rawData: { simulated: true }, timestamp: Date.now() };
  }

  private async queryPythNetwork(marketId: string, criteria: string): Promise<OracleResult> {
    return { source: "pyth_network", outcome: Math.random() > 0.5, confidence: 0.85, rawData: { simulated: true }, timestamp: Date.now() };
  }

  private async queryCoinGecko(marketId: string, criteria: string): Promise<OracleResult> {
    return { source: "coingecko_api", outcome: Math.random() > 0.5, confidence: 0.7, rawData: { simulated: true }, timestamp: Date.now() };
  }

  private evaluateCriteria(price: number, criteria: string): boolean {
    const match = criteria.match(/above_(\d+)/);
    if (match) return price > parseInt(match[1]);
    return price > 0;
  }
}
