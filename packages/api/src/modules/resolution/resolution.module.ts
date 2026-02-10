import { Module } from "@nestjs/common";
import { ResolutionService } from "./resolution.service";
import { MarketsModule } from "../markets/markets.module";

@Module({
  imports: [MarketsModule],
  providers: [ResolutionService],
  exports: [ResolutionService],
})
export class ResolutionModule {}
