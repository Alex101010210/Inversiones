# 📈 Investment ERP

A full-stack **ERP specialised in investments** — portfolios, operations, risk analysis, technical indicators, and AI-powered insights.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| State | Zustand + React Query |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma ORM |
| Market Data | Alpha Vantage (stocks/ETFs) + CoinGecko (crypto) |
| AI | OpenAI GPT-4o-mini |
| News | NewsAPI |
| Scheduler | node-cron (daily price sync) |

---

## 📦 Modules

| Module | Features |
|--------|---------|
| **Portfolio** | Manage multiple portfolios; holdings auto-calculated from operations |
| **Operations** | BUY / SELL / DIVIDEND / SPLIT / TRANSFER — all with fees |
| **Risk** | Drawdown, Annualised Volatility, Sharpe Ratio, VaR 95% |
| **Technical Analysis** | RSI, MACD, SMA, EMA with interactive charts |
| **AI Insights** | Recommendations, Trend Prediction, News Sentiment (OpenAI) |
| **Dashboard** | P&L, allocation pie, performance chart, quick actions |

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 15+

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and API keys
npm install
npm run db:migrate   # Creates all tables
npm run db:seed      # Populates sample assets + price history
npm run dev          # http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

---

## 🔑 Environment Variables (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `ALPHA_VANTAGE_KEY` | [alphavantage.co](https://www.alphavantage.co/support/#api-key) — free tier available |
| `OPENAI_API_KEY` | Required for AI Insights module |
| `NEWS_API_KEY` | [newsapi.org](https://newsapi.org) — free tier available |

> **Without API keys** the app still works — stubbed market data is used for development.

---

## 🗂️ Project Structure

```
investment-erp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     ← DB schema (User, Portfolio, Asset, Operation…)
│   │   └── seed.js           ← Sample data
│   └── src/
│       ├── config/           ← Prisma, market data adapter, scheduler
│       ├── middleware/        ← JWT auth, error handler, validation
│       └── modules/
│           ├── auth/          ← Register / Login / Me
│           ├── portfolio/     ← Portfolios + Holdings + Assets
│           ├── operations/    ← Buy/Sell/Dividend tracking
│           ├── risk/          ← Drawdown, Sharpe, VaR
│           ├── analysis/      ← RSI, MACD, SMA, EMA
│           ├── ai/            ← GPT recommendations, trend, news
│           └── dashboard/     ← Summary, allocation, performance
└── frontend/
    └── src/
        ├── api/              ← Axios client for all endpoints
        ├── store/            ← Zustand (auth + active portfolio)
        ├── components/ui/    ← Shared UI components
        └── pages/            ← Dashboard, Portfolio, Operations, Risk, Analysis, AI
```

---

## 📡 API Reference

All endpoints require `Authorization: Bearer <token>` except `/api/auth/*`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/portfolios` | List portfolios |
| GET | `/api/portfolios/:id/holdings` | Holdings with live P&L |
| GET/POST | `/api/operations` | List / create operations |
| GET | `/api/risk/portfolio/:id` | Risk metrics |
| GET | `/api/analysis/:symbol/full` | RSI + MACD + SMA in one call |
| GET | `/api/ai/recommendations/:portfolioId` | GPT portfolio advice |
| GET | `/api/ai/predict/:symbol` | GPT trend prediction |
| GET | `/api/ai/news/:symbol` | News sentiment analysis |
| GET | `/api/dashboard/overview` | All portfolios summary |
