import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { MarketsModule } from "./modules/markets/markets.module";

@Module({
  imports: [ScheduleModule.forRoot(), MarketsModule],
})
export class AppModule {}
