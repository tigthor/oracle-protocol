import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://testnet.oracle.markets",
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
  ];

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  app.setGlobalPrefix("api/v1");

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🔮 ORACLE API running on http://localhost:${port}`);
  console.log(`   Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Network: ${process.env.HYPERLIQUID_TESTNET === "true" ? "TESTNET" : "MAINNET"}`);
  console.log(`   Port: ${port}`);
}

bootstrap();
