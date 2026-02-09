import { Module } from "@nestjs/common";
import { OracleGateway } from "./oracle.gateway";
import { MarketsModule } from "../markets/markets.module";

@Module({
  imports: [MarketsModule],
  providers: [OracleGateway],
})
export class WebSocketModule {}
