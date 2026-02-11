import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { MarketsService } from "../markets/markets.service";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/ws",
})
export class OracleGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OracleGateway.name);
  private connectedClients = 0;
  // Cleanup interval on module destroy to prevent memory leaks
  private priceInterval: NodeJS.Timeout | null = null;

  constructor(private readonly marketsService: MarketsService) {}

  async onModuleInit() {
    // Start broadcasting prices every 2 seconds
    this.priceInterval = setInterval(async () => {
      try {
        const prices = await this.marketsService.getAllPrices();
        this.server?.emit("prices", {
          type: "price_update",
          data: prices,
          timestamp: Date.now(),
        });
      } catch {
        // Silent fail on price broadcast
      }
    }, 2000);

    // Broadcast market updates every 5 seconds
    setInterval(async () => {
      try {
        const { markets } = await this.marketsService.getAll({ limit: 50 });
        this.server?.emit("markets", {
          type: "market_update",
          data: markets,
          timestamp: Date.now(),
        });
      } catch {
        // Silent fail
      }
    }, 5000);
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients})`);
  }

  @SubscribeMessage("subscribe:market")
  handleSubscribeMarket(@ConnectedSocket() client: Socket, @MessageBody() data: { marketId: string }) {
    client.join(`market:${data.marketId}`);
    this.logger.debug(`Client ${client.id} subscribed to ${data.marketId}`);
    return { event: "subscribed", data: { marketId: data.marketId } };
  }

  @SubscribeMessage("subscribe:orderbook")
  async handleSubscribeOrderbook(@ConnectedSocket() client: Socket, @MessageBody() data: { coin: string }) {
    const room = `orderbook:${data.coin}`;
    client.join(room);
    const orderbook = await this.marketsService.getOrderBook(data.coin);
    client.emit("orderbook:snapshot", { type: "orderbook_snapshot", data: orderbook, timestamp: Date.now() });
    return { event: "subscribed", data: { coin: data.coin } };
  }

  @SubscribeMessage("unsubscribe")
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { channel: string }) {
    client.leave(data.channel);
    return { event: "unsubscribed", data: { channel: data.channel } };
  }

  @SubscribeMessage("ping")
  handlePing() {
    return { event: "pong", timestamp: Date.now() };
  }

  broadcastToMarket(marketId: string, event: string, data: any) {
    this.server.to(`market:${marketId}`).emit(event, data);
  }

  broadcastOrderbook(coin: string, data: any) {
    this.server.to(`orderbook:${coin}`).emit("orderbook:delta", {
      type: "orderbook_delta", data, timestamp: Date.now(),
    });
  }
}
