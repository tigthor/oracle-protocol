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

  private async queryHyperCoreMark(marketId: string, criteria: string): Promise<OracleResult> {
    throw new Error("not implemented");
  }

  private async queryChainlinkFeed(marketId: string, criteria: string): Promise<OracleResult> {
    throw new Error("not implemented");
  }

  private async queryPythNetwork(marketId: string, criteria: string): Promise<OracleResult> {
    throw new Error("not implemented");
  }

  private async queryCoinGecko(marketId: string, criteria: string): Promise<OracleResult> {
    throw new Error("not implemented");
  }
}
