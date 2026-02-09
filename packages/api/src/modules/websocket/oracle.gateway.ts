import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { MarketsService } from "../markets/markets.service";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/ws",
})
export class OracleGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OracleGateway.name);
  private connectedClients = 0;
  // Cleanup interval on module destroy
  private priceInterval: NodeJS.Timeout | null = null;

  constructor(private readonly marketsService: MarketsService) {}

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients})`);
  }
}
