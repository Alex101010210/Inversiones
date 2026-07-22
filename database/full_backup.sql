--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AssetType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssetType" AS ENUM (
    'STOCK',
    'ETF',
    'CRYPTO',
    'BOND',
    'COMMODITY'
);


--
-- Name: InsightType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InsightType" AS ENUM (
    'RECOMMENDATION',
    'TREND_PREDICTION',
    'NEWS_ANALYSIS',
    'RISK_ALERT'
);


--
-- Name: OperationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OperationType" AS ENUM (
    'BUY',
    'SELL',
    'DIVIDEND',
    'SPLIT',
    'TRANSFER_IN',
    'TRANSFER_OUT'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AiInsight; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiInsight" (
    id text NOT NULL,
    "portfolioId" text,
    "assetId" text,
    type public."InsightType" NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    confidence double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Asset" (
    id text NOT NULL,
    symbol text NOT NULL,
    name text NOT NULL,
    type public."AssetType" NOT NULL,
    exchange text,
    sector text,
    currency text DEFAULT 'USD'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Holding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Holding" (
    id text NOT NULL,
    "portfolioId" text NOT NULL,
    "assetId" text NOT NULL,
    quantity double precision NOT NULL,
    "avgCostBasis" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Operation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Operation" (
    id text NOT NULL,
    "portfolioId" text NOT NULL,
    "assetId" text NOT NULL,
    type public."OperationType" NOT NULL,
    quantity double precision NOT NULL,
    price double precision NOT NULL,
    fees double precision DEFAULT 0 NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Portfolio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Portfolio" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    currency text DEFAULT 'USD'::text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PriceAlert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceAlert" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "assetId" text NOT NULL,
    condition text NOT NULL,
    threshold double precision NOT NULL,
    note text,
    active boolean DEFAULT true NOT NULL,
    "triggeredAt" timestamp(3) without time zone,
    "triggeredPrice" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PriceHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceHistory" (
    id text NOT NULL,
    "assetId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    open double precision NOT NULL,
    high double precision NOT NULL,
    low double precision NOT NULL,
    close double precision NOT NULL,
    volume double precision NOT NULL
);


--
-- Name: RiskSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RiskSnapshot" (
    id text NOT NULL,
    "portfolioId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "totalValue" double precision NOT NULL,
    drawdown double precision NOT NULL,
    volatility double precision NOT NULL,
    "sharpeRatio" double precision NOT NULL,
    beta double precision,
    var95 double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WatchlistItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WatchlistItem" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "assetId" text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AiInsight; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Asset; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Asset" VALUES ('cmrv1ee2y0003sheewzgxpi4n', 'IBM', 'International Business Machines', 'STOCK', 'NYQ', 'Technology', 'USD', '2026-07-21 19:18:55.691', '2026-07-21 19:18:55.691');
INSERT INTO public."Asset" VALUES ('cmrv1jx1e0009sheeap4m39y7', 'BTC-USD', 'Bitcoin USD', 'CRYPTO', 'CCC', NULL, 'USD', '2026-07-21 19:23:13.539', '2026-07-21 19:23:13.539');
INSERT INTO public."Asset" VALUES ('cmrv2al76000gsheed0787c7e', 'AAPL', 'Apple Inc.', 'STOCK', 'NMS', 'Technology', 'USD', '2026-07-21 19:43:57.907', '2026-07-21 19:43:57.907');


--
-- Data for Name: Holding; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Operation; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Portfolio; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Portfolio" VALUES ('cmrusqw9q0002dcpkhgfm743q', 'My Portfolio', NULL, 'USD', 'cmrusqw9j0000dcpkzrnbgzg6', '2026-07-21 15:16:42.591', '2026-07-21 15:16:42.591');
INSERT INTO public."Portfolio" VALUES ('cmrv1c1ef0002sheenolccm7y', 'My Portfolio', NULL, 'USD', 'cmrv1c1e60000shee3eomrcjr', '2026-07-21 19:17:05.943', '2026-07-21 19:17:05.943');
INSERT INTO public."Portfolio" VALUES ('cmrv29c56000fshee8qjogupu', 'xz', 'z', 'MXN', 'cmrv1c1e60000shee3eomrcjr', '2026-07-21 19:42:59.514', '2026-07-21 19:42:59.514');


--
-- Data for Name: PriceAlert; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: PriceHistory; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: RiskSnapshot; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."User" VALUES ('cmrusqw9j0000dcpkzrnbgzg6', 'grzalex@gmail.com', '$2a$12$GfgegpPXDleOfqmxnKc3j.rxaeR5jUyRHF3urg3BfKbcauUfZ9osi', 'Alex reyes', '2026-07-21 15:16:42.583', '2026-07-21 15:16:42.583');
INSERT INTO public."User" VALUES ('cmrv1c1e60000shee3eomrcjr', 'a@email.com', '$2a$12$EY8gfERhw2WSZJyaacCp..vjFAcC0ZFtzVIX/9GWBOhkGAJ9HjX4i', 'dw', '2026-07-21 19:17:05.935', '2026-07-21 19:17:05.935');


--
-- Data for Name: WatchlistItem; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public._prisma_migrations VALUES ('cd8b79f5-bee6-453f-a015-3e1fef5125c1', 'a9433000d613e35342c05c62247f7f64aeff2573b63c8c347e8bacb3dd7df1d9', '2026-07-21 09:10:53.055715-06', '20260721151052_init', NULL, NULL, '2026-07-21 09:10:52.941483-06', 1);
INSERT INTO public._prisma_migrations VALUES ('cdf9cd25-fd26-4b85-b524-5643d701a5db', '329521e71d487514de10948e8cfee207a9cc952dc256f0e5ee6cd011877422ce', '2026-07-21 09:27:54.076831-06', '20260721152753_add_alerts_watchlist', NULL, NULL, '2026-07-21 09:27:53.996048-06', 1);


--
-- Name: AiInsight AiInsight_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiInsight"
    ADD CONSTRAINT "AiInsight_pkey" PRIMARY KEY (id);


--
-- Name: Asset Asset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_pkey" PRIMARY KEY (id);


--
-- Name: Holding Holding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Holding"
    ADD CONSTRAINT "Holding_pkey" PRIMARY KEY (id);


--
-- Name: Operation Operation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operation"
    ADD CONSTRAINT "Operation_pkey" PRIMARY KEY (id);


--
-- Name: Portfolio Portfolio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Portfolio"
    ADD CONSTRAINT "Portfolio_pkey" PRIMARY KEY (id);


--
-- Name: PriceAlert PriceAlert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceAlert"
    ADD CONSTRAINT "PriceAlert_pkey" PRIMARY KEY (id);


--
-- Name: PriceHistory PriceHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceHistory"
    ADD CONSTRAINT "PriceHistory_pkey" PRIMARY KEY (id);


--
-- Name: RiskSnapshot RiskSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RiskSnapshot"
    ADD CONSTRAINT "RiskSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WatchlistItem WatchlistItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WatchlistItem"
    ADD CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Asset_symbol_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Asset_symbol_key" ON public."Asset" USING btree (symbol);


--
-- Name: Holding_portfolioId_assetId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Holding_portfolioId_assetId_key" ON public."Holding" USING btree ("portfolioId", "assetId");


--
-- Name: PriceAlert_userId_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PriceAlert_userId_active_idx" ON public."PriceAlert" USING btree ("userId", active);


--
-- Name: PriceHistory_assetId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PriceHistory_assetId_date_idx" ON public."PriceHistory" USING btree ("assetId", date);


--
-- Name: PriceHistory_assetId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PriceHistory_assetId_date_key" ON public."PriceHistory" USING btree ("assetId", date);


--
-- Name: RiskSnapshot_portfolioId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RiskSnapshot_portfolioId_date_idx" ON public."RiskSnapshot" USING btree ("portfolioId", date);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: WatchlistItem_userId_assetId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WatchlistItem_userId_assetId_key" ON public."WatchlistItem" USING btree ("userId", "assetId");


--
-- Name: Holding Holding_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Holding"
    ADD CONSTRAINT "Holding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Holding Holding_portfolioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Holding"
    ADD CONSTRAINT "Holding_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES public."Portfolio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Operation Operation_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operation"
    ADD CONSTRAINT "Operation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Operation Operation_portfolioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operation"
    ADD CONSTRAINT "Operation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES public."Portfolio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Portfolio Portfolio_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Portfolio"
    ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PriceAlert PriceAlert_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceAlert"
    ADD CONSTRAINT "PriceAlert_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PriceHistory PriceHistory_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceHistory"
    ADD CONSTRAINT "PriceHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WatchlistItem WatchlistItem_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WatchlistItem"
    ADD CONSTRAINT "WatchlistItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--



