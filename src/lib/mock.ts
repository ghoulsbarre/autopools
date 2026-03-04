/**
 * Mock data derived from the Autopool subgraph schema.
 *
 * Pool types:
 *   "Total"  – all pools combined, values in USD (ETH price movement included)
 *   "USD"    – USD-denominated pools only (autoUSD, baseUSD …), values in USD
 *   "ETH"    – ETH-denominated pools only, primary values in ETH,
 *              USD equivalents stored alongside for tooltip display
 *
 * Subgraph sources:
 *   TVL          → AutopoolDayData.totalAssetsUSD / totalAssets (ETH)
 *   Deposits     → AutopoolDayData.assetsDepositedTotalUSD (cumulative diff)
 *   Withdrawals  → AutopoolDayData.assetsWithdrawnTotalUSD (cumulative diff)
 *   NAV/share    → AutopoolDayData.navPerShare
 *   Suppliers    → AutopoolDayData.totalSuppliers
 */

export interface DaySnapshot {
  date: string;

  // ── Total (all pools, USD) ────────────────────────────────────────────────
  totalAssetsUSD: number;
  assetsDepositedTotalUSD: number;
  assetsWithdrawnTotalUSD: number;

  // ── USD pools only ────────────────────────────────────────────────────────
  usdPoolAssetsUSD: number;
  usdPoolDepositedTotalUSD: number;
  usdPoolWithdrawnTotalUSD: number;

  // ── ETH pools only (primary in ETH, secondary in USD for tooltip) ─────────
  ethPoolAssetsETH: number;
  ethPoolAssetsUSD: number;
  ethPoolDepositedTotalETH: number;
  ethPoolDepositedTotalUSD: number;
  ethPoolWithdrawnTotalETH: number;
  ethPoolWithdrawnTotalUSD: number;

  // ── Shared ────────────────────────────────────────────────────────────────
  ethPriceUSD: number;          // ETH/USD spot price for the day
  navPerShare: number;
  totalSuppliers: number;
  feesCollected: number;
}

export interface FlowPoint {
  date: string;
  // primary values (USD for Total/USD mode, ETH for ETH mode)
  deposits: number;
  withdrawals: number;
  net: number;
  // secondary USD values (only populated in ETH mode, for tooltip)
  depositsUSD?: number;
  withdrawalsUSD?: number;
  netUSD?: number;
}

// ─── RNG ─────────────────────────────────────────────────────────────────────

function seed(n: number) {
  let s = n;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── History generation ───────────────────────────────────────────────────────
//
// Anchored to real protocol state on 2026-03-03:
//   Total TVL  ~$66.0M  |  USD pools ~$48.3M  |  ETH pools ~$17.7M (~8,990 ETH)
//   ETH price  ~$1,967  |  Depositors ~1,500
//
// History starts 1 year prior at plausible lower levels and trends toward the
// anchored end state using a gentle daily drift and realistic flow volumes.

function generateHistory(days: number): DaySnapshot[] {
  const rngTotal  = seed(42);
  const rngUsd    = seed(99);
  const rngEth    = seed(77);
  const rngPrice  = seed(13);

  const snapshots: DaySnapshot[] = [];

  // ── Starting state (≈1 year ago) ────────────────────────────────────────────
  // Real end values: total $66M, USD $48.3M, ETH $17.7M (~9,000 ETH at ~$1,967)
  // History starts a year prior at lower levels; dep/wit are symmetric on average
  // so TVL change = drift term only, keeping the end-state anchored.
  // Starting values pre-calibrated so the end state (after 365 days of random
  // walk + drift) lands on the real protocol values on 2026-03-03.
  let tvlTotal = 30_347_000;
  let cumDepTotal = 0, cumWitTotal = 0;

  let tvlUSD = 14_171_000;
  let cumDepUSD = 0, cumWitUSD = 0;

  // ETH pools — tracked in ETH; ETH was higher a year ago (~$2,500)
  let ethPrice = 2_500;
  let tvlETH = 6_012;   // ETH at start; drifts to ~9,000 ETH by end
  let cumDepETH = 0, cumWitETH = 0;
  let cumDepETHinUSD = 0, cumWitETHinUSD = 0;

  let navPerShare = 1.0;
  let suppliers   = 750;
  let cumulativeFees = 0;

  // Pure drift: balanced dep/wit (avg net ≈ 0) + explicit daily trend
  const totalDrift = (66_000_000 - 34_000_000) / days;   // ~+$87.7K/day
  const usdDrift   = (48_300_000 - 19_500_000) / days;   // ~+$78.9K/day

  const now = new Date("2026-03-03");

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    // ETH price: started ~$2,500, drifts down toward ~$1,967 with daily noise
    ethPrice = Math.max(1_600, ethPrice * (1 + (rngPrice() - 0.519) * 0.028));

    // Symmetric dep/wit — same base + scale so average net = 0; drift moves TVL
    const depTotal = 400_000 + rngTotal() * 1_400_000;
    const witTotal = 400_000 + rngTotal() * 1_400_000;
    tvlTotal = Math.max(10_000_000, tvlTotal + (depTotal - witTotal) + totalDrift);

    const depUSD = 250_000 + rngUsd() * 900_000;
    const witUSD = 250_000 + rngUsd() * 900_000;
    tvlUSD = Math.max(5_000_000, tvlUSD + (depUSD - witUSD) + usdDrift);

    // ETH pool flows (in ETH) — symmetric, slight upward bias from new pools
    const depETH = 5 + rngEth() * 40;
    const witETH = 5 + rngEth() * 40;
    tvlETH = Math.max(500, tvlETH + (depETH - witETH) + 8.7);  // +8.7 ETH/day drift

    navPerShare = navPerShare * (1 + (rngTotal() - 0.48) * 0.0006);
    // Suppliers: grow from 750 to ~1,500 → avg +2/day
    suppliers = Math.max(500, suppliers + Math.round(2 + (rngTotal() - 0.5) * 8));

    cumDepTotal    += depTotal;
    cumWitTotal    += witTotal;
    cumDepUSD      += depUSD;
    cumWitUSD      += witUSD;
    cumDepETH      += depETH;
    cumWitETH      += witETH;
    cumDepETHinUSD += depETH * ethPrice;
    cumWitETHinUSD += witETH * ethPrice;
    cumulativeFees += tvlTotal * 0.0002 * (1 / 365);

    snapshots.push({
      date: dateStr,
      totalAssetsUSD:           tvlTotal,
      assetsDepositedTotalUSD:  cumDepTotal,
      assetsWithdrawnTotalUSD:  cumWitTotal,
      usdPoolAssetsUSD:         tvlUSD,
      usdPoolDepositedTotalUSD: cumDepUSD,
      usdPoolWithdrawnTotalUSD: cumWitUSD,
      ethPoolAssetsETH:         tvlETH,
      ethPoolAssetsUSD:         tvlETH * ethPrice,
      ethPoolDepositedTotalETH: cumDepETH,
      ethPoolDepositedTotalUSD: cumDepETHinUSD,
      ethPoolWithdrawnTotalETH: cumWitETH,
      ethPoolWithdrawnTotalUSD: cumWitETHinUSD,
      ethPriceUSD:              ethPrice,
      navPerShare,
      totalSuppliers:           suppliers,
      feesCollected:            cumulativeFees,
    });
  }

  return snapshots;
}

export const MOCK_HISTORY: DaySnapshot[] = generateHistory(365);
export const MOCK_VAULT = MOCK_HISTORY[MOCK_HISTORY.length - 1];

// ─── Per-pool data (sourced from Tokemak subgraph, 2026-03-03) ────────────────
//
//  Subgraph endpoints:
//    Mainnet  → https://subgraph.tokemaklabs.com/api/graphql/1
//    Base     → https://subgraph.tokemaklabs.com/api/graphql/8453
//    Arbitrum → https://subgraph.tokemaklabs.com/api/graphql/42161
//    Linea    → https://subgraph.tokemaklabs.com/api/graphql/59144
//    Sonic    → https://subgraph.tokemaklabs.com/api/graphql/146
//    Plasma   → https://subgraph.tokemaklabs.com/api/graphql/9745
//
//  Raw subgraph values use 1e8 fixed-point for USD amounts and 1e18 for native
//  token amounts.  All values below are already scaled to human-readable units.

export interface PoolSummary {
  id: string;           // on-chain vault address
  name: string;
  symbol: string;
  chain: string;        // network name (mainnet, base, arbitrum, linea, sonic, …)
  chainId: number;      // EVM chain ID
  denom: "ETH" | "USD"; // display category: ETH-like vs stablecoin
  denomToken: string;   // actual underlying token (WETH, USDC, DOLA, EURC, USDT0, …)
  tvlUSD: number;
  tvlNative: number;    // ETH for ETH pools, USD amount for stable pools
  weeklyNetFlowUSD: number;
  weeklyNetFlowNative: number;
  depositors: number;
  navPerShare: number;
  paused: boolean;
  shutdown: boolean;
}

// Sorted by TVL descending; USD values: subgraph BigInt ÷ 1e8; ETH native: BigInt ÷ 1e18
export const MOCK_POOLS: PoolSummary[] = [
  // ── Ethereum mainnet ─────────────────────────────────────────────────────────
  {
    id: "0xa7569a44f348d3d70d8ad5889e50f78e33d80d35",
    name: "Tokemak autoUSD",
    symbol: "autoUSD",
    chain: "mainnet", chainId: 1,
    denom: "USD", denomToken: "USDC",
    tvlUSD: 20_452_448, tvlNative: 20_452_448,
    weeklyNetFlowUSD: 561_290, weeklyNetFlowNative: 561_290,
    depositors: 181, navPerShare: 1.0, paused: false, shutdown: false,
  },
  {
    id: "0x0a2b94f6871c1d7a32fe58e1ab5e6dea2f114e56",
    name: "Tokemak autoETH",
    symbol: "autoETH",
    chain: "mainnet", chainId: 1,
    denom: "ETH", denomToken: "WETH",
    tvlUSD: 17_086_158, tvlNative: 8_688.7,
    weeklyNetFlowUSD: -65_034, weeklyNetFlowNative: -33.1,
    depositors: 409, navPerShare: 1.0, paused: false, shutdown: false,
  },
  {
    id: "0x408b6a3e2daf288864968454aae786a2a042df36",
    name: "Tokemak siloUSD",
    symbol: "siloUSD",
    chain: "mainnet", chainId: 1,
    denom: "USD", denomToken: "USDC",
    tvlUSD: 8_714_833, tvlNative: 8_714_833,
    weeklyNetFlowUSD: 0, weeklyNetFlowNative: 0,
    depositors: 8, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Base ─────────────────────────────────────────────────────────────────────
  {
    id: "0x9c6864105aec23388c89600046213a44c384c831",
    name: "Tokemak baseUSD",
    symbol: "baseUSD",
    chain: "base", chainId: 8453,
    denom: "USD", denomToken: "USDC",
    tvlUSD: 16_067_652, tvlNative: 16_067_652,
    weeklyNetFlowUSD: -1_458_981, weeklyNetFlowNative: -1_458_981,
    depositors: 547, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Arbitrum ─────────────────────────────────────────────────────────────────
  {
    id: "0xf63b7f49b4f5dc5d0e7e583cfd79dc64e646320c",
    name: "Tokemak arbUSD",
    symbol: "arbUSD",
    chain: "arbitrum", chainId: 42161,
    denom: "USD", denomToken: "USDC",
    tvlUSD: 1_345_342, tvlNative: 1_345_342,
    weeklyNetFlowUSD: -76_351, weeklyNetFlowNative: -76_351,
    depositors: 78, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Plasma (chain 9745) ───────────────────────────────────────────────────────
  {
    id: "0x4ec8f8b0f144ce1fa280b84f01df9e353e83ec80",
    name: "Tokemak plasmaUSD",
    symbol: "plasmaUSD",
    chain: "plasma", chainId: 9745,
    denom: "USD", denomToken: "USDT0",
    tvlUSD: 799_705, tvlNative: 799_705,
    weeklyNetFlowUSD: -648_995, weeklyNetFlowNative: -648_995,
    depositors: 36, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Base (cont.) ─────────────────────────────────────────────────────────────
  {
    id: "0xaadf01dd90ae0a6bb9eb908294658037096e0404",
    name: "Tokemak baseETH",
    symbol: "baseETH",
    chain: "base", chainId: 8453,
    denom: "ETH", denomToken: "WETH",
    tvlUSD: 545_969, tvlNative: 272.57,
    weeklyNetFlowUSD: 329, weeklyNetFlowNative: 0.16,
    depositors: 237, navPerShare: 1.0, paused: false, shutdown: false,
  },
  {
    id: "0xeb042dee6f7ff3b45ef0a71686653d168fb02477",
    name: "Tokemak baseEUR",
    symbol: "baseEUR",
    chain: "base", chainId: 8453,
    denom: "USD", denomToken: "EURC",
    tvlUSD: 381_013, tvlNative: 381_013,
    weeklyNetFlowUSD: -84_401, weeklyNetFlowNative: -84_401,
    depositors: 51, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Mainnet (cont.) ──────────────────────────────────────────────────────────
  {
    id: "0x1abd0403591be494771115d74ed9e120530f356e",
    name: "Anchorage/AUTOfinance anchrgUSD",
    symbol: "anchrgUSD",
    chain: "mainnet", chainId: 1,
    denom: "USD", denomToken: "USDC",
    tvlUSD: 321_912, tvlNative: 321_912,
    weeklyNetFlowUSD: 0, weeklyNetFlowNative: 0,
    depositors: 7, navPerShare: 1.0, paused: false, shutdown: false,
  },
  {
    id: "0x79eb84b5e30ef2481c8f00fd0aa7aad6ac0aa54d",
    name: "Tokemak autoDOLA",
    symbol: "autoDOLA",
    chain: "mainnet", chainId: 1,
    denom: "USD", denomToken: "DOLA",
    tvlUSD: 133_147, tvlNative: 133_147,
    weeklyNetFlowUSD: -25, weeklyNetFlowNative: -25,
    depositors: 15, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Linea ─────────────────────────────────────────────────────────────────────
  {
    id: "0xd1a6524fccd465eca7af2340b3d7fd2e3bbd792a",
    name: "Tokemak lineaUSD",
    symbol: "lineaUSD",
    chain: "linea", chainId: 59144,
    denom: "USD", denomToken: "USDC",
    tvlUSD: 102_099, tvlNative: 102_099,
    weeklyNetFlowUSD: 0, weeklyNetFlowNative: 0,
    depositors: 10, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Mainnet (cont.) ──────────────────────────────────────────────────────────
  {
    id: "0xe800e3760fc20aa98c5df6a9816147f190455af3",
    name: "Tokemak autoLRT",
    symbol: "autoLRT",
    chain: "mainnet", chainId: 1,
    denom: "ETH", denomToken: "WETH",
    tvlUSD: 19_505, tvlNative: 6.3,
    weeklyNetFlowUSD: 0, weeklyNetFlowNative: 0,
    depositors: 22, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Sonic ─────────────────────────────────────────────────────────────────────
  {
    id: "0xcb119265aa1195ea363d7a243ad56c73ea42eb59",
    name: "Tokemak sonicUSD",
    symbol: "sonicUSD",
    chain: "sonic", chainId: 146,
    denom: "USD", denomToken: "USDC.e",
    tvlUSD: 7_226, tvlNative: 7_226,
    weeklyNetFlowUSD: -5_898, weeklyNetFlowNative: -5_898,
    depositors: 44, navPerShare: 1.0, paused: false, shutdown: false,
  },
  // ── Mainnet (cont.) ──────────────────────────────────────────────────────────
  {
    id: "0xc7d7f434c015f2a7e77df9763ade300f2171a05a",
    name: "AUTOfinance infinifiUSD",
    symbol: "infinifiUSD",
    chain: "mainnet", chainId: 1,
    denom: "USD", denomToken: "USDC",
    tvlUSD: 6_307, tvlNative: 6_307,
    weeklyNetFlowUSD: 0, weeklyNetFlowNative: 0,
    depositors: 6, navPerShare: 1.0, paused: false, shutdown: false,
  },
  {
    id: "0x52f0d57fb5d4780a37164f918746f9bd51c684a3",
    name: "Tokemak siloETH",
    symbol: "siloETH",
    chain: "mainnet", chainId: 1,
    denom: "ETH", denomToken: "WETH",
    tvlUSD: 3_075, tvlNative: 1.5,
    weeklyNetFlowUSD: 0, weeklyNetFlowNative: 0,
    depositors: 8, navPerShare: 1.0, paused: false, shutdown: false,
  },
  {
    id: "0x35911af1b570e26f668905595ded133d01cd3e5a",
    name: "Dinero/Tokemak dineroETH",
    symbol: "dineroETH",
    chain: "mainnet", chainId: 1,
    denom: "ETH", denomToken: "pxETH",
    tvlUSD: 1_955, tvlNative: 1.0,
    weeklyNetFlowUSD: 0, weeklyNetFlowNative: 0,
    depositors: 6, navPerShare: 1.0, paused: false, shutdown: false,
  },
  {
    id: "0x6dc3ce9c57b20131347fdc9089d740daf6eb34c5",
    name: "Balancer/Tokemak balETH",
    symbol: "balETH",
    chain: "mainnet", chainId: 1,
    denom: "ETH", denomToken: "WETH",
    tvlUSD: 1_012, tvlNative: 0.3,
    weeklyNetFlowUSD: 0, weeklyNetFlowNative: 0,
    depositors: 30, navPerShare: 1.0, paused: false, shutdown: false,
  },
];

// ─── Flow derivation ──────────────────────────────────────────────────────────

export type Denom = "Total" | "USD" | "ETH";

export function getDailyFlows(snapshots: DaySnapshot[], denom: Denom): FlowPoint[] {
  return snapshots.map((s, i) => {
    const prev = snapshots[i - 1];

    if (denom === "ETH") {
      const deposits      = prev ? s.ethPoolDepositedTotalETH - prev.ethPoolDepositedTotalETH : 0;
      const withdrawals   = prev ? s.ethPoolWithdrawnTotalETH - prev.ethPoolWithdrawnTotalETH : 0;
      const depositsUSD   = prev ? s.ethPoolDepositedTotalUSD - prev.ethPoolDepositedTotalUSD : 0;
      const withdrawalsUSD = prev ? s.ethPoolWithdrawnTotalUSD - prev.ethPoolWithdrawnTotalUSD : 0;
      return { date: s.date, deposits, withdrawals, net: deposits - withdrawals, depositsUSD, withdrawalsUSD, netUSD: depositsUSD - withdrawalsUSD };
    }

    const [depKey, witKey] = denom === "USD"
      ? ["usdPoolDepositedTotalUSD", "usdPoolWithdrawnTotalUSD"] as const
      : ["assetsDepositedTotalUSD",  "assetsWithdrawnTotalUSD"]  as const;

    const deposits    = prev ? s[depKey] - prev[depKey] : 0;
    const withdrawals = prev ? s[witKey] - prev[witKey] : 0;
    return { date: s.date, deposits, withdrawals, net: deposits - withdrawals };
  });
}

export function getWeeklyFlows(snapshots: DaySnapshot[], denom: Denom): FlowPoint[] {
  const daily = getDailyFlows(snapshots, denom);
  const buckets: Record<string, FlowPoint> = {};
  for (const d of daily) {
    const monday = getMondayOf(d.date);
    if (!buckets[monday]) {
      buckets[monday] = { date: monday, deposits: 0, withdrawals: 0, net: 0, depositsUSD: 0, withdrawalsUSD: 0, netUSD: 0 };
    }
    buckets[monday].deposits    += d.deposits;
    buckets[monday].withdrawals += d.withdrawals;
    buckets[monday].net         += d.net;
    if (d.depositsUSD !== undefined) buckets[monday].depositsUSD! += d.depositsUSD;
    if (d.withdrawalsUSD !== undefined) buckets[monday].withdrawalsUSD! += d.withdrawalsUSD;
    if (d.netUSD !== undefined) buckets[monday].netUSD! += d.netUSD;
  }
  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
}

export function getWeeklyTVL(snapshots: DaySnapshot[]): DaySnapshot[] {
  const buckets: Record<string, DaySnapshot> = {};
  for (const s of snapshots) {
    buckets[getMondayOf(s.date)] = { ...s, date: getMondayOf(s.date) };
  }
  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
}

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ─── Time range helpers ───────────────────────────────────────────────────────

export type TimeRange = "1W" | "1M" | "YTD" | "1Y";
export type Granularity = "daily" | "weekly";

export interface RangeConfig {
  snapshots: DaySnapshot[];
  granularity: Granularity;
}

export function getRangeConfig(range: TimeRange, history: DaySnapshot[] = MOCK_HISTORY): RangeConfig {
  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  switch (range) {
    case "1W":  return { snapshots: history.slice(-8),   granularity: "daily" };
    case "1M":  return { snapshots: history.slice(-31),  granularity: "daily" };
    case "YTD": {
      const jan1    = `${today.getUTCFullYear()}-01-01`;
      const visible = history.filter(s => s.date >= jan1 && s.date <= todayStr);
      const ctxIdx  = history.findIndex(s => s.date >= jan1);
      const withCtx = ctxIdx > 0 ? [history[ctxIdx - 1], ...visible] : visible;
      return { snapshots: withCtx, granularity: visible.length > 180 ? "weekly" : "daily" };
    }
    case "1Y":  return { snapshots: history.slice(-366), granularity: "weekly" };
  }
}

// ─── Notable-event mock data ──────────────────────────────────────────────────
//
// In production these come from AutopoolOperation (per-wallet) and
// AutopoolDayData (daily TVL delta) subgraph queries.

export interface WalletFlowEvent {
  amountUSD: number;
  /** ISO 8601 datetime string */
  datetime: string;
  pool: string;
  positive: boolean;  // true = deposit, false = withdrawal
}

export interface BigTVLDayEvent {
  changeUSD: number;  // signed (positive = TVL grew)
  date: string;       // YYYY-MM-DD
}

// ── Depositor statistics ─────────────────────────────────────────────────────
// Real values require per-wallet subgraph queries; medians are mocked.
export interface DepositorStats {
  meanDepositUSD: number;
  medianDepositUSD: number;
}

// Since inception: cumulative deposits ÷ current depositor count (proxy for
// average lifetime deposits per wallet; real value needs wallet-level query).
export const MOCK_DEPOSITOR_STATS_INCEPTION: DepositorStats = {
  meanDepositUSD:   Math.round(MOCK_VAULT.assetsDepositedTotalUSD / MOCK_VAULT.totalSuppliers),
  // Right-skewed distribution; median well below mean
  medianDepositUSD: 34_000,
};

// Current depositors: TVL ÷ active depositors = average live position size.
export const MOCK_DEPOSITOR_STATS_CURRENT: DepositorStats = {
  meanDepositUSD:   Math.round(MOCK_VAULT.totalAssetsUSD / MOCK_VAULT.totalSuppliers),
  medianDepositUSD: 8_500,
};

// ── Deposit patterns ─────────────────────────────────────────────────────────
// Median number of discrete deposit transactions per wallet
export const MOCK_MEDIAN_DEPOSIT_COUNT = 1.8;

// Deposit size distribution — current holders bucketed by live position size
// (Holder.sharesHeld × navPerShare in USD).
// Bimodal: retail cluster at $1K–$10K, whale cluster at $100K–$500K.
export interface DepositBucket {
  label: string;  // human-readable range
  count: number;  // number of wallets in this bucket
}

export const MOCK_DEPOSIT_DISTRIBUTION: DepositBucket[] = [
  { label: "$100–1K",   count:  80 },
  { label: "$1K–10K",   count: 520 },
  { label: "$10K–50K",  count: 310 },
  { label: "$50K–100K", count: 140 },
  { label: "$100K–500K",count: 280 },
  { label: "$500K–1M",  count: 120 },
  { label: "$1M+",      count:  50 },
];

// Cohort conviction: median position size change since first deposit, grouped
// by when the wallet joined.  Positive = wallet increased their position.
export interface CohortConviction {
  label: string;    // human-readable cohort window
  changePct: number; // median % change in position size since first deposit
  wallets: number;   // cohort size
}

export const MOCK_COHORT_CONVICTION: CohortConviction[] = [
  { label: "9–12 mo",  changePct: +18, wallets: 312 },
  { label: "6–9 mo",   changePct: +11, wallets: 284 },
  { label: "3–6 mo",   changePct:  +4, wallets: 401 },
  { label: "0–3 mo",   changePct:  -6, wallets: 511 },
];

// ── Retention curve by deposit tier ──────────────────────────────────────────
// Survival curves: X = days since first deposit, Y = % of wallets in that tier
// still holding.  Tiers match the deposit size distribution buckets.
// Pattern: larger depositors decay more slowly — curves diverge upward with tier.
export interface RetentionCurvePoint {
  day: number;
  t1: number;  // $100–1K
  t2: number;  // $1K–10K
  t3: number;  // $10K–50K
  t4: number;  // $50K–100K
  t5: number;  // $100K–500K
  t6: number;  // $500K–1M
  t7: number;  // $1M+
}

export const RETENTION_TIER_LABELS: Record<string, string> = {
  t1: "$100–1K",
  t2: "$1K–10K",
  t3: "$10K–50K",
  t4: "$50K–100K",
  t5: "$100K–500K",
  t6: "$500K–1M",
  t7: "$1M+",
};

export const MOCK_RETENTION_BY_TIER: RetentionCurvePoint[] = [
  { day:   0, t1: 100, t2: 100, t3: 100, t4: 100, t5: 100, t6: 100, t7: 100 },
  { day:  30, t1:  65, t2:  72, t3:  78, t4:  82, t5:  85, t6:  88, t7:  90 },
  { day:  60, t1:  52, t2:  59, t3:  66, t4:  71, t5:  76, t6:  80, t7:  83 },
  { day:  90, t1:  40, t2:  50, t3:  57, t4:  63, t5:  68, t6:  73, t7:  77 },
  { day: 120, t1:  32, t2:  42, t3:  50, t4:  56, t5:  62, t6:  67, t7:  72 },
  { day: 180, t1:  24, t2:  33, t3:  40, t4:  47, t5:  52, t6:  58, t7:  64 },
  { day: 240, t1:  18, t2:  26, t3:  32, t4:  39, t5:  45, t6:  51, t7:  57 },
  { day: 300, t1:  14, t2:  21, t3:  27, t4:  33, t5:  38, t6:  44, t7:  51 },
  { day: 365, t1:  11, t2:  17, t3:  22, t4:  28, t5:  33, t6:  39, t7:  46 },
];

// ── Churn waterfall ───────────────────────────────────────────────────────────
// Monthly TVL entering (new depositors) vs exiting — both sides visible at once.
// Inflows stored positive, outflows stored as negative.
export interface ChurnWaterfallBar {
  label: string;
  inflow: number;   // new depositor TVL (USD)
  outflow: number;  // exited TVL as a negative number (USD)
}

export const MOCK_CHURN_WATERFALL: ChurnWaterfallBar[] = [
  { label: "Mar 25", inflow:  5_200_000, outflow: -2_100_000 },
  { label: "Apr 25", inflow:  4_800_000, outflow: -3_200_000 },
  { label: "May 25", inflow:  6_100_000, outflow: -2_800_000 },
  { label: "Jun 25", inflow:  3_900_000, outflow: -4_500_000 },
  { label: "Jul 25", inflow:  4_200_000, outflow: -3_800_000 },
  { label: "Aug 25", inflow:  5_500_000, outflow: -2_900_000 },
  { label: "Sep 25", inflow:  7_200_000, outflow: -3_100_000 },
  { label: "Oct 25", inflow:  6_800_000, outflow: -4_200_000 },
  { label: "Nov 25", inflow:  8_100_000, outflow: -3_500_000 },
  { label: "Dec 25", inflow:  5_900_000, outflow: -4_800_000 },
  { label: "Jan 26", inflow:  7_400_000, outflow: -3_200_000 },
  { label: "Feb 26", inflow:  6_200_000, outflow: -4_100_000 },
  { label: "Mar 26*", inflow:  680_000, outflow: -290_000 },
];

// ── Cohort retention heatmap ──────────────────────────────────────────────────
// Rows = monthly deposit cohorts; columns = % of that cohort still holding at
// 30 / 60 / 90 / 180 days after their first deposit.
// null = time window not yet elapsed for that cohort (as of 2026-03-03).
// Pattern: declining retention Mar–Aug 25 as market softened, recovery Sep 25+
// as product improvements landed.
export interface RetentionCohort {
  label: string;
  d30:  number | null;
  d60:  number | null;
  d90:  number | null;
  d180: number | null;
}

export const MOCK_RETENTION_COHORTS: RetentionCohort[] = [
  { label: "Mar 25", d30: 78, d60: 65, d90: 58, d180: 48 },
  { label: "Apr 25", d30: 72, d60: 60, d90: 52, d180: 44 },
  { label: "May 25", d30: 70, d60: 57, d90: 49, d180: 41 },
  { label: "Jun 25", d30: 65, d60: 53, d90: 45, d180: 38 },
  { label: "Jul 25", d30: 63, d60: 50, d90: 43, d180: 36 },
  { label: "Aug 25", d30: 61, d60: 48, d90: 40, d180: 33 },
  { label: "Sep 25", d30: 59, d60: 46, d90: 38, d180: null },
  { label: "Oct 25", d30: 62, d60: 49, d90: 41, d180: null },
  { label: "Nov 25", d30: 64, d60: 51, d90: null, d180: null },
  { label: "Dec 25", d30: 67, d60: 54, d90: null, d180: null },
  { label: "Jan 26", d30: 69, d60: null, d90: null, d180: null },
  { label: "Feb 26", d30: 71, d60: null, d90: null, d180: null },
];

// ── Depositor behavior ────────────────────────────────────────────────────────
// All values mocked; real values require per-wallet deposit/withdrawal timestamp
// queries from AutopoolOperation entities in the subgraph.

export interface HoldTimeStats {
  medianDays: number;  // median days between first deposit and first full exit
  meanDays: number;    // mean (pulled higher by long-term holders)
}

export const MOCK_HOLD_TIME: HoldTimeStats = {
  medianDays: 47,
  meanDays:   112,
};

// % of wallets that deposited in the last 6 months and fully exited within N days
export interface ChurnStats {
  d30: number;  // churn within 30 days
  d60: number;  // churn within 60 days
  d90: number;  // churn within 90 days
}

export const MOCK_CHURN: ChurnStats = {
  d30: 24,
  d60: 38,
  d90: 51,
};

// % of wallets that fully withdrew at least once and subsequently re-deposited
export const MOCK_REDEPOSIT_RATE = 34;

// Top-10 wallet concentration — mocked; real value requires per-wallet query.
// Each entry is { pct: share of total TVL, usd: absolute position size }.
export const MOCK_TOP10_WALLETS: { pct: number; usd: number }[] = [
  { pct: 14.2, usd: 9_372_000 },
  { pct:  9.8, usd: 6_467_000 },
  { pct:  7.1, usd: 4_685_000 },
  { pct:  5.4, usd: 3_563_000 },
  { pct:  4.9, usd: 3_234_000 },
  { pct:  3.8, usd: 2_508_000 },
  { pct:  3.1, usd: 2_046_000 },
  { pct:  2.7, usd: 1_782_000 },
  { pct:  2.3, usd: 1_518_000 },
  { pct:  1.9, usd: 1_254_000 },
];
export const MOCK_TOP10_PCT = MOCK_TOP10_WALLETS.reduce((s, w) => s + w.pct, 0);

// ── Gini coefficient ──────────────────────────────────────────────────────────
// Measures deposit inequality across all wallets (0 = perfect equality, 1 = one
// wallet holds everything).  In production, computed from Holder.sharesHeld.
//
// Mock distribution: power-law by rank (alpha ≈ 0.875) scaled to real TVL,
// which produces a top-10 concentration consistent with MOCK_TOP10_WALLETS.

export function computeGini(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((s, v) => s + v, 0);
  if (n === 0 || total === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (2 * (i + 1) - n - 1) * sorted[i];
  return sum / (n * total);
}

function generateMockWalletBalances(): number[] {
  const n   = MOCK_VAULT.totalSuppliers;
  const tvl = MOCK_VAULT.totalAssetsUSD;
  // Zipf-like power law (rank 1 = largest holder)
  const raw   = Array.from({ length: n }, (_, i) => Math.pow(i + 1, -1.2));
  const total = raw.reduce((s, v) => s + v, 0);
  return raw.map(v => (v / total) * tvl);
}

export const MOCK_WALLET_BALANCES = generateMockWalletBalances();
export const MOCK_GINI = computeGini(MOCK_WALLET_BALANCES);

// Last single-wallet deposit > $50 K
export const MOCK_LAST_BIG_DEPOSIT: WalletFlowEvent = {
  amountUSD: 127_400,
  datetime: "2026-02-28T14:23:00Z",
  pool: "autoUSD",
  positive: true,
};

// Last single-wallet withdrawal > $50 K
export const MOCK_LAST_BIG_WITHDRAWAL: WalletFlowEvent = {
  amountUSD: 89_200,
  datetime: "2026-03-01T08:47:00Z",
  pool: "baseUSD",
  positive: false,
};

// Last day where absolute protocol TVL change exceeded $100 K
// Derived from MOCK_HISTORY so it reflects the calibrated data.
function findLastBigTVLDay(): BigTVLDayEvent {
  for (let i = MOCK_HISTORY.length - 1; i >= 1; i--) {
    const change = MOCK_HISTORY[i].totalAssetsUSD - MOCK_HISTORY[i - 1].totalAssetsUSD;
    if (Math.abs(change) >= 100_000) {
      return { changeUSD: change, date: MOCK_HISTORY[i].date };
    }
  }
  return { changeUSD: 0, date: MOCK_HISTORY[MOCK_HISTORY.length - 1].date };
}

export const MOCK_LAST_BIG_TVL_DAY: BigTVLDayEvent = findLastBigTVLDay();

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
