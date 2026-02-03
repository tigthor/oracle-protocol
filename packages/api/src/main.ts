import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001", "https://testnet.oracle.markets"],
      credentials: true,
    },
  });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🔮 ORACLE API running on http://localhost:${port}`);
}

bootstrap();
