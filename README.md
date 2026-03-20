# 🔮 ORACLE Protocol

**Institutional-Grade Prediction Markets on Hyperliquid HIP-4**

[![Testnet](https://img.shields.io/badge/network-Hyperliquid%20Testnet-blue)](https://app.hyperliquid-testnet.xyz)
[![HIP-4](https://img.shields.io/badge/standard-HIP--4%20Outcomes-green)](https://hyperliquid.gitbook.io)
[![License](https://img.shields.io/badge/license-MIT-purple)](LICENSE)

The first prediction market built natively on Hyperliquid's HFT infrastructure. Sub-100ms execution, zero gas, full CLOB composability with perps and portfolio margin.

## Why ORACLE?

| Feature | ORACLE (HL) | Polymarket | Kalshi |
|---------|------------|------------|--------|
| **Order Book** | Native CLOB (on-chain) | AMM pools | Off-chain CLOB |
| **Execution** | <100ms | ~2s | ~500ms |
| **Gas Fees** | Zero | Low (Polygon) | N/A |
| **Composability** | Perps + portfolio margin | None | None |
| **Settlement** | USDH (on-chain) | USDC | USD (bank) |
| **KYC** | No | No | Yes |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 CLIENT LAYER                     │
│  Next.js 14 · TradingView · WalletConnect · PWA │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              API GATEWAY LAYER                   │
│  NestJS · GraphQL · WebSocket · Redis · Auth     │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│               ORACLE ENGINE                      │
│  Market Factory · Resolution · Liquidity · Risk  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│          HYPERLIQUID LAYER (HIP-4)               │
│  HyperCore CLOB · HyperEVM · USDH · Portfolio   │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│           DATA & INDEXING LAYER                   │
│  PostgreSQL · TimescaleDB · The Graph · Redis    │
└─────────────────────────────────────────────────┘
```

## Monorepo Structure

```
oracle-protocol/
├── packages/
│   ├── sdk/                    # @oracle/sdk — Shared types + HL client
│   │   └── src/
│   │       ├── types.ts        # Core type definitions
│   │       ├── hyperliquid-client.ts  # Direct HL API wrapper
│   │       └── oracle-sdk.ts   # Prediction market abstraction
│   │
│   ├── api/                    # @oracle/api — NestJS backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── markets/    # REST endpoints + HL data
│   │       │   ├── websocket/  # Real-time price streaming
│   │       │   └── resolution/ # Multi-oracle consensus
│   │       └── main.ts
│   │
│   ├── web/                    # @oracle/web — Next.js frontend
│   │   └── src/
│   │       └── app/
│   │           └── demo.jsx    # Live testnet demo
│   │
│   └── contracts/              # @oracle/contracts — HyperEVM
│       ├── src/
│       │   ├── OracleMarketFactory.sol
│       │   └── OracleResolutionOracle.sol
│       └── scripts/
│           └── deploy.ts
│
├── docker/
│   └── init.sql                # Database schema + seeds
├── docker-compose.yml          # Full local stack
├── turbo.json                  # Turborepo pipeline
└── .env.example                # Configuration template
```

## Quick Start

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose (for local DB/Redis)

### 1. Clone & Install

```bash
git clone https://github.com/tigthor/oracle-protocol.git
cd oracle-protocol
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your testnet wallet key (for contract deployment)
```

### 3. Start Infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Run Development

```bash
# All packages in parallel
pnpm dev

# Or individually
pnpm dev:api    # NestJS API on :4000
pnpm dev:web    # Next.js frontend on :3000
pnpm dev:sdk    # SDK watch mode
```

### 5. Deploy Contracts (optional)

```bash
cd packages/contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network hyperevm-testnet
```

## How It Works

### HIP-4 Outcome Contracts

ORACLE markets map 1:1 to HIP-4 outcome contracts on HyperCore:

- **Price = Probability**: A YES contract trading at 0.67 means the market implies a 67% chance
- **Settlement**: Contracts settle at 0 (NO) or 1 (YES) in USDH
- **No Leverage**: Fully collateralized, 1x isolated margin — max loss = your premium
- **No Liquidation**: Zero leverage means no forced liquidations, ever
- **Zero Gas**: HyperCore transactions are gasless for end-users

### Composability (The Killer Feature)

Unlike Polymarket or Kalshi, ORACLE positions compose with Hyperliquid's full derivatives stack:

```
Long BTC $100K YES @ 0.67        →  Directional bet
+ Short BTC Perp (hedge)          →  Delta-neutral
= Portfolio Margin recognizes both →  Reduced collateral requirement
```

This is native cross-product hedging that traditionally costs institutional desks significant overhead.

### Resolution Oracle

Markets resolve through weighted multi-oracle consensus:

1. **HyperCore Mark Price** (weight: 3) — Native on-chain price
2. **Chainlink Feed** (weight: 3) — Industry standard oracle
3. **Pyth Network** (weight: 2) — High-frequency price feed
4. **Custom API** (weight: 1) — Fallback verification

A 60% weighted quorum is required. Dispute window of 24h (mainnet) or instant (testnet) before final settlement.

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/markets` | List all markets (filterable) |
| GET | `/api/v1/markets/:id` | Get single market |
| GET | `/api/v1/markets/:id/orderbook` | Live order book from HL CLOB |
| GET | `/api/v1/markets/:id/trades` | Recent trades |
| GET | `/api/v1/markets/:id/candles` | OHLCV candle data |
| GET | `/api/v1/markets/prices/all` | All mid prices |
| GET | `/api/v1/markets/user/:addr/positions` | User positions |
| GET | `/api/v1/markets/user/:addr/balance` | User balance |

### WebSocket Events

```javascript
// Connect
const ws = new WebSocket('ws://localhost:4000/ws');

// Subscribe to price feed
ws.send(JSON.stringify({ event: 'subscribe:market', data: { marketId: 'hl-BTC' } }));

// Events received:
// prices        — All mid price updates (2s interval)
// markets       — Market state updates (5s interval)
// orderbook:snapshot — Full book on subscribe
// orderbook:delta   — Incremental book updates
```

## Smart Contracts

### OracleMarketFactory (HyperEVM)

The canonical registry for all ORACLE markets. Deployed on HyperEVM (chain ID 998 testnet / 999 mainnet).

Key functions:
- `createMarket(params)` — Deploy a new prediction market
- `resolveMarket(marketId, outcome)` — Resolve with oracle consensus
- `getActiveMarkets(offset, limit)` — Query active markets
- `enablePermissionlessMode()` — Phase 2: open market creation

### OracleResolutionOracle (HyperEVM)

Multi-source oracle aggregator with weighted voting, dispute windows, and reporter reputation tracking.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TradingView | Trading UI |
| State | Zustand, React Query | Client state |
| API | NestJS, GraphQL, Socket.io | Backend gateway |
| Database | PostgreSQL + TimescaleDB | Time-series data |
| Cache | Redis Cluster | Price cache + pub/sub |
| Blockchain | HyperCore (HIP-4), HyperEVM | Settlement + registry |
| Oracles | Chainlink, Pyth, HyperCore | Price feeds |
| Indexing | The Graph, custom indexer | On-chain data |
| Infra | Docker, Kubernetes, Terraform | Deployment |
| Monitoring | Prometheus, Grafana | Observability |

## Roadmap

### Phase 1: Testnet (Current)
- [x] Core SDK with Hyperliquid integration
- [x] REST API with live testnet data
- [x] WebSocket real-time streaming
- [x] HyperEVM smart contracts
- [x] Multi-oracle resolution engine
- [x] Interactive frontend demo
- [ ] Builder code integration
- [ ] Testnet trading simulation

### Phase 2: Mainnet Launch
- [ ] Curated market deployment
- [ ] USDH settlement integration
- [ ] Portfolio margin composability
- [ ] Mobile PWA with push notifications
- [ ] Institutional API (FIX protocol)

### Phase 3: Permissionless
- [ ] Open market creation (stake HYPE)
- [ ] Community resolution oracles
- [ ] Cross-chain settlement bridges
- [ ] SDK for third-party frontends

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE) for details.

---

**Built with conviction on [Hyperliquid](https://hyperliquid.xyz) HIP-4** 🔮
