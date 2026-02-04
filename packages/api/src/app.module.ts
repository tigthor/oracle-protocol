import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { MarketsModule } from "./modules/markets/markets.module";
import { WebSocketModule } from "./modules/websocket/websocket.module";
import { ResolutionModule } from "./modules/resolution/resolution.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MarketsModule,
    WebSocketModule,
    ResolutionModule,
  ],
})
export class AppModule {}
