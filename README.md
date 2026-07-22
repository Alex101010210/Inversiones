# 📈 Investment ERP

ERP full-stack especializado en inversiones — portafolios, operaciones, análisis de riesgo, indicadores técnicos e insights con IA.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Estado | Zustand + React Query |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 15+ + Prisma ORM |
| Datos de mercado | Alpha Vantage (acciones/ETFs) + CoinGecko (crypto) |
| IA | OpenAI GPT-4o-mini |
| Noticias | NewsAPI |
| Scheduler | node-cron (sincronización diaria de precios) |

---

## ✅ Requisitos Previos

Antes de instalar el proyecto, asegúrate de tener lo siguiente instalado:

### 1. Node.js 18 o superior
- Descarga desde: https://nodejs.org/
- Verifica con: `node -v` (debe mostrar v18 o mayor)

### 2. PostgreSQL 15 o superior
- Descarga desde: https://www.postgresql.org/download/
- Durante la instalación se te pedirá una contraseña para el usuario `postgres` — **anótala**
- Verifica con: `psql --version`

### 3. Git
- Descarga desde: https://git-scm.com/
- Verifica con: `git --version`

### 4. API Keys (opcionales para desarrollo)
El proyecto funciona sin ellas usando datos de stub, pero para producción necesitas:

| Variable | Dónde obtenerla | Plan gratuito |
|----------|----------------|---------------|
| `ALPHA_VANTAGE_KEY` | https://www.alphavantage.co/support/#api-key | ✅ Sí |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys | ❌ De pago |
| `NEWS_API_KEY` | https://newsapi.org/register | ✅ Sí |

---

## 🚀 Instalación Paso a Paso

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

---

### Paso 2 — Crear la base de datos en PostgreSQL

Abre una terminal y conéctate a PostgreSQL:

```bash
# En Windows (busca "SQL Shell (psql)" en el menú inicio)
# En Mac/Linux:
psql -U postgres
```

Dentro de psql, ejecuta:

```sql
CREATE DATABASE investment_erp;
\q
```

---

### Paso 3 — Configurar variables de entorno del backend

```bash
cd backend
copy .env.example .env       # En Windows
# cp .env.example .env       # En Mac/Linux
```

Abre el archivo `.env` con cualquier editor y edítalo:

```env
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/investment_erp"
JWT_SECRET="cambia-esto-por-algo-secreto-largo"
PORT=3001

ALPHA_VANTAGE_KEY="tu-api-key-aqui"
COINGECKO_BASE_URL="https://api.coingecko.com/api/v3"

OPENAI_API_KEY="tu-openai-key-aqui"
NEWS_API_KEY="tu-newsapi-key-aqui"
```

> 💡 Reemplaza `TU_CONTRASEÑA` por la contraseña que pusiste al instalar PostgreSQL.  
> 💡 Sin API keys el proyecto igual arranca — usa datos de stub para desarrollo.

---

### Paso 4 — Instalar dependencias e inicializar la base de datos

```bash
# Asegúrate de estar en la carpeta backend/
cd backend

npm install                  # Instala dependencias
npm run db:migrate           # Crea todas las tablas en PostgreSQL
npm run db:seed              # Pobla activos (AAPL, MSFT, BTC, etc.) y precios históricos
```

---

### Paso 5 — Levantar el backend

```bash
npm run dev
# Servidor corriendo en http://localhost:3001
```

---

### Paso 6 — Instalar y levantar el frontend

Abre **otra terminal** (deja el backend corriendo):

```bash
cd frontend
npm install
npm run dev
# App corriendo en http://localhost:5173
```

---

### Paso 7 — Abrir la app

Abre tu navegador en: **http://localhost:5173**

1. Haz clic en **Register** y crea una cuenta
2. *(Opcional)* Carga datos demo de operaciones: `npm run db:seed:demo` (desde `backend/`)
3. ¡Listo! Ya puedes explorar el ERP

---

## 📦 Módulos

| Módulo | Funcionalidades |
|--------|----------------|
| **Portfolio** | Gestiona múltiples portafolios; holdings calculados automáticamente desde operaciones |
| **Operaciones** | BUY / SELL / DIVIDEND / SPLIT / TRANSFER — con comisiones |
| **Riesgo** | Drawdown, Volatilidad Anualizada, Sharpe Ratio, VaR 95% |
| **Análisis Técnico** | RSI, MACD, SMA, EMA con gráficos interactivos |
| **AI Insights** | Recomendaciones, predicción de tendencias, sentimiento de noticias (OpenAI) |
| **Dashboard** | P&L, gráfico de asignación, rendimiento histórico, acciones rápidas |

---

## 🔑 Variables de Entorno (`backend/.env`)

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | ✅ Sí |
| `JWT_SECRET` | Secreto para firmar JWT | ✅ Sí |
| `PORT` | Puerto del servidor (default: 3001) | No |
| `ALPHA_VANTAGE_KEY` | Datos de mercado para acciones/ETFs | No* |
| `OPENAI_API_KEY` | Módulo de AI Insights | No* |
| `NEWS_API_KEY` | Análisis de noticias | No* |

*Sin estas keys el app usa datos de stub para desarrollo.

---

## 🗂️ Estructura del Proyecto

```
investment-erp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← Esquema DB (User, Portfolio, Asset, Operation…)
│   │   ├── seed.js                ← Activos y precios históricos de muestra
│   │   ├── seedOperations.js      ← Operaciones demo (6 meses)
│   │   └── migrations/            ← Historial de cambios SQL (versión controlada)
│   └── src/
│       ├── config/                ← Prisma client, datos de mercado, scheduler
│       ├── middleware/            ← JWT auth, error handler, validación
│       └── modules/
│           ├── auth/              ← Register / Login / Me
│           ├── portfolio/         ← Portafolios + Holdings + Assets
│           ├── operations/        ← Buy/Sell/Dividend tracking
│           ├── risk/              ← Drawdown, Sharpe, VaR
│           ├── analysis/          ← RSI, MACD, SMA, EMA
│           ├── ai/                ← Recomendaciones GPT, tendencias, noticias
│           └── dashboard/         ← Resumen, asignación, rendimiento
└── frontend/
    └── src/
        ├── api/                   ← Cliente Axios para todos los endpoints
        ├── store/                 ← Zustand (auth + portafolio activo)
        ├── components/ui/         ← Componentes UI compartidos
        └── pages/                 ← Dashboard, Portfolio, Operations, Risk, Analysis, AI
```

---

## 📡 API Reference

Todos los endpoints requieren `Authorization: Bearer <token>` excepto `/api/auth/*`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/portfolios` | Listar portafolios |
| GET | `/api/portfolios/:id/holdings` | Holdings con P&L en tiempo real |
| GET/POST | `/api/operations` | Listar / crear operaciones |
| GET | `/api/risk/portfolio/:id` | Métricas de riesgo |
| GET | `/api/analysis/:symbol/full` | RSI + MACD + SMA en una llamada |
| GET | `/api/ai/recommendations/:portfolioId` | Consejos GPT para el portafolio |
| GET | `/api/ai/predict/:symbol` | Predicción de tendencia GPT |
| GET | `/api/ai/news/:symbol` | Análisis de sentimiento de noticias |
| GET | `/api/dashboard/overview` | Resumen de todos los portafolios |

---

## ❓ Problemas Comunes

**`Error: connect ECONNREFUSED 127.0.0.1:5432`**  
→ PostgreSQL no está corriendo. Inicia el servicio:
- Windows: Busca "Services" → "postgresql-x64-15" → Start
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

**`error: database "investment_erp" does not exist`**  
→ No creaste la base de datos. Ejecuta el Paso 2.

**`Invalid prisma.migration` / tablas no creadas**  
→ Corre `npm run db:migrate` desde la carpeta `backend/`.

**Frontend no conecta con el backend**  
→ Verifica que el backend corra en el puerto 3001 y que el frontend esté en 5173.
