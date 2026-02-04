import { Module } from "@nestjs/common";
import { MarketsModule } from "./modules/markets/markets.module";

@Module({
  imports: [MarketsModule],
})
export class AppModule {}
