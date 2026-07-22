--
-- PostgreSQL database dump
--

\restrict KJmdqIwcAqADWyFuhkfmpJ1JtHH1veTuDBSEkI8rhdppwvWpkeZJiHSJasVydAT

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
-- Data for Name: AiInsight; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Asset; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Asset" VALUES ('cmrv1ee2y0003sheewzgxpi4n', 'IBM', 'International Business Machines', 'STOCK', 'NYQ', 'Technology', 'USD', '2026-07-21 19:18:55.691', '2026-07-21 19:18:55.691');
INSERT INTO public."Asset" VALUES ('cmrv1jx1e0009sheeap4m39y7', 'BTC-USD', 'Bitcoin USD', 'CRYPTO', 'CCC', NULL, 'USD', '2026-07-21 19:23:13.539', '2026-07-21 19:23:13.539');
INSERT INTO public."Asset" VALUES ('cmrv2al76000gsheed0787c7e', 'AAPL', 'Apple Inc.', 'STOCK', 'NMS', 'Technology', 'USD', '2026-07-21 19:43:57.907', '2026-07-21 19:43:57.907');


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."User" VALUES ('cmrusqw9j0000dcpkzrnbgzg6', 'grzalex@gmail.com', '$2a$12$GfgegpPXDleOfqmxnKc3j.rxaeR5jUyRHF3urg3BfKbcauUfZ9osi', 'Alex reyes', '2026-07-21 15:16:42.583', '2026-07-21 15:16:42.583');
INSERT INTO public."User" VALUES ('cmrv1c1e60000shee3eomrcjr', 'a@email.com', '$2a$12$EY8gfERhw2WSZJyaacCp..vjFAcC0ZFtzVIX/9GWBOhkGAJ9HjX4i', 'dw', '2026-07-21 19:17:05.935', '2026-07-21 19:17:05.935');


--
-- Data for Name: Portfolio; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Portfolio" VALUES ('cmrusqw9q0002dcpkhgfm743q', 'My Portfolio', NULL, 'USD', 'cmrusqw9j0000dcpkzrnbgzg6', '2026-07-21 15:16:42.591', '2026-07-21 15:16:42.591');
INSERT INTO public."Portfolio" VALUES ('cmrv1c1ef0002sheenolccm7y', 'My Portfolio', NULL, 'USD', 'cmrv1c1e60000shee3eomrcjr', '2026-07-21 19:17:05.943', '2026-07-21 19:17:05.943');
INSERT INTO public."Portfolio" VALUES ('cmrv29c56000fshee8qjogupu', 'xz', 'z', 'MXN', 'cmrv1c1e60000shee3eomrcjr', '2026-07-21 19:42:59.514', '2026-07-21 19:42:59.514');


--
-- Data for Name: Holding; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Operation; Type: TABLE DATA; Schema: public; Owner: -
--



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
-- Data for Name: WatchlistItem; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public._prisma_migrations VALUES ('cd8b79f5-bee6-453f-a015-3e1fef5125c1', 'a9433000d613e35342c05c62247f7f64aeff2573b63c8c347e8bacb3dd7df1d9', '2026-07-21 09:10:53.055715-06', '20260721151052_init', NULL, NULL, '2026-07-21 09:10:52.941483-06', 1);
INSERT INTO public._prisma_migrations VALUES ('cdf9cd25-fd26-4b85-b524-5643d701a5db', '329521e71d487514de10948e8cfee207a9cc952dc256f0e5ee6cd011877422ce', '2026-07-21 09:27:54.076831-06', '20260721152753_add_alerts_watchlist', NULL, NULL, '2026-07-21 09:27:53.996048-06', 1);


--
-- PostgreSQL database dump complete
--

\unrestrict KJmdqIwcAqADWyFuhkfmpJ1JtHH1veTuDBSEkI8rhdppwvWpkeZJiHSJasVydAT

