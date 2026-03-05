#!/usr/bin/env node
/**
 * fetch-stats.js
 *
 * Pulls live data from the Tokemak Autopool subgraphs, computes all
 * dashboard metrics, and writes two JSON files into public/:
 *
 *   public/protocol-data.json   — history, pools, headline events
 *   public/deposits-stats.json  — wallet-level analytics (Gini, retention…)
 *
 * Run via GitHub Actions nightly, or locally:
 *   SUBGRAPH_BASE_URL=https://... node scripts/fetch-stats.js
 *
 * Requires Node >= 18 (native fetch).
 *
 * Verified schema field names (introspected 2026-03-03):
 *   AutopoolDayData.vault { id }          (not autopool)
 *   userAutopoolBalanceChanges            (not autopoolOperations)
 *     .walletAddress / .vaultAddress / .timestamp / .items { assetChange shareChange }
 *   Holder.user { id }                    (not account)
 *   Holder.autoPool { id navPerShare }    (capital P; not autopool)
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────

const SUBGRAPH_BASE = (process.env.SUBGRAPH_BASE_URL || "https://subgraph.tokemaklabs.com/api/graphql").replace(/\/$/, "");
const OUT_DIR       = path.join(__dirname, "..", "public");

const CHAINS = [
  { id: 1,     name: "mainnet"  },
  { id: 8453,  name: "base"     },
  { id: 42161, name: "arbitrum" },
  { id: 59144, name: "linea"    },
  { id: 146,   name: "sonic"    },
  { id: 9745,  name: "plasma"   },
];

// Tokens whose pools are counted as ETH-denominated
const ETH_TOKENS = new Set(["WETH", "ETH", "WETH.e", "pxETH", "stETH", "rETH", "wstETH", "weETH", "ezETH"]);

// Fixed-point divisors used by the subgraph
const DIV_USD    = 1e8;
const DIV_NATIVE = 1e18;

const COINBASE_ETH_PRICE_URL = "https://api.coinbase.com/v2/prices/ETH-USD/spot";

// How many days of history to keep
const HISTORY_DAYS = 365;

// ── GraphQL helpers ────────────────────────────────────────────────────────────

async function gql(chainId, query) {
  const url = `${SUBGRAPH_BASE}/${chainId}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} querying chain ${chainId}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GQL errors on chain ${chainId}: ${JSON.stringify(json.errors)}`);
  return json.data;
}

/** Paginate through all records of an entity. */
async function paginate(chainId, buildQuery, dataKey, batchSize = 1000) {
  const all  = [];
  let   skip = 0;
  while (true) {
    process.stdout.write(`  chain=${chainId} ${dataKey} skip=${skip}\r`);
    const data  = await gql(chainId, buildQuery(batchSize, skip));
    const items = data[dataKey] ?? [];
    all.push(...items);
    if (items.length < batchSize) break;
    skip += batchSize;
    await sleep(200); // gentle rate limiting
  }
  process.stdout.write("\n");
  return all;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Scaling helpers ────────────────────────────────────────────────────────────

/** Divide a subgraph BigInt string by DIV_USD to get a USD float. */
function su(v) { return Number(v) / DIV_USD; }

/** Divide a subgraph BigInt string by DIV_NATIVE to get a native-token float. */
function sn(v) { return Number(v) / DIV_NATIVE; }

/** Convert a subgraph Unix-seconds timestamp to YYYY-MM-DD. */
function dayStr(unixSec) {
  return new Date(Number(unixSec) * 1000).toISOString().slice(0, 10);
}

/** Most recent Monday (ISO date string). */
function getMondayOf(dateStr) {
  const d   = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── Subgraph fetches ───────────────────────────────────────────────────────────

/** Fetch all Autopool metadata on a given chain. */
async function fetchPools(chainId) {
  const data = await gql(chainId, `{
    autopools(first: 100, orderBy: totalAssetsUSD, orderDirection: desc) {
      id
      name
      symbol
      paused
      shutdown
      navPerShare
      totalSuppliers
      totalAssets
      totalAssetsUSD
      baseAsset { id symbol decimals }
    }
  }`);
  return (data.autopools ?? []).map(p => ({
    ...p,
    chainId,
    chainName: CHAINS.find(c => c.id === chainId)?.name ?? String(chainId),
  }));
}

/** Fetch AutopoolDayData for a chain, starting from a YYYY-MM-DD string. */
async function fetchDayData(chainId, sinceDate) {
  return paginate(chainId, (first, skip) => `{
    autopoolDayDatas(
      first: ${first}
      skip: ${skip}
      orderBy: lastUpdateTimestamp
      orderDirection: asc
      where: { date_gte: "${sinceDate}", vault_not: null }
    ) {
      id
      date
      vault { id }
      totalAssetsUSD
      totalAssets
      assetsDepositedTotalUSD
      assetsWithdrawnTotalUSD
      assetsDepositedTotal
      assetsWithdrawnTotal
      navPerShare
      totalSuppliers
    }
  }`, "autopoolDayDatas");
}

/** Fetch ALL UserAutopoolBalanceChange records on a chain (wallet-level analytics). */
async function fetchAllOperations(chainId) {
  return paginate(chainId, (first, skip) => `{
    userAutopoolBalanceChanges(
      first: ${first}
      skip: ${skip}
      orderBy: timestamp
      orderDirection: asc
    ) {
      id
      walletAddress
      vaultAddress
      timestamp
      items {
        assetChange
        shareChange
      }
    }
  }`, "userAutopoolBalanceChanges");
}

/** Fetch the most recent N balance-change events for headline event tiles. */
async function fetchRecentOps(chainId, limit = 200) {
  const data = await gql(chainId, `{
    userAutopoolBalanceChanges(
      first: ${limit}
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      walletAddress
      vaultAddress
      timestamp
      items {
        assetChange
      }
    }
  }`);
  return data.userAutopoolBalanceChanges ?? [];
}

/** Fetch all current holders with non-zero balances on a chain. */
async function fetchHolders(chainId) {
  return paginate(chainId, (first, skip) => `{
    holders(
      first: ${first}
      skip: ${skip}
      where: { sharesHeld_gt: "0" }
    ) {
      user { id }
      autoPool { id navPerShare }
      sharesHeld
    }
  }`, "holders");
}

// ── History aggregation ────────────────────────────────────────────────────────

/**
 * Merge per-pool AutopoolDayData rows across all chains into one DaySnapshot[]
 * aggregated by date.
 *
 * @param {Array}  allDayData  - flat array of raw AutopoolDayData rows
 * @param {Map}    poolMap     - pool id → pool metadata (from fetchPools)
 */
function buildHistory(allDayData, poolMap) {
  const byDate = new Map();

  for (const dd of allDayData) {
    const date = dd.date; // already "YYYY-MM-DD" string from the subgraph
    const pool = poolMap.get(dd.vault?.id);
    if (!pool) continue;

    const isEth      = ETH_TOKENS.has(pool.baseAsset?.symbol ?? "");
    const usdAssets  = su(dd.totalAssetsUSD ?? "0");
    const natAssets  = sn(dd.totalAssets     ?? "0");
    const depUSD     = su(dd.assetsDepositedTotalUSD ?? "0");
    const witUSD     = su(dd.assetsWithdrawnTotalUSD ?? "0");
    // Native cumulative flows — present for ETH pools; fall back to 0 if absent
    const depNat     = dd.assetsDepositedTotal ? sn(dd.assetsDepositedTotal) : 0;
    const witNat     = dd.assetsWithdrawnTotal ? sn(dd.assetsWithdrawnTotal) : 0;

    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        totalAssetsUSD:           0,
        assetsDepositedTotalUSD:  0,
        assetsWithdrawnTotalUSD:  0,
        usdPoolAssetsUSD:         0,
        usdPoolDepositedTotalUSD: 0,
        usdPoolWithdrawnTotalUSD: 0,
        ethPoolAssetsETH:         0,
        ethPoolAssetsUSD:         0,
        ethPoolDepositedTotalETH: 0,
        ethPoolDepositedTotalUSD: 0,
        ethPoolWithdrawnTotalETH: 0,
        ethPoolWithdrawnTotalUSD: 0,
        ethPriceUSD:              0,
        navPerShare:              1,
        totalSuppliers:           0,
        feesCollected:            0,
        _ethUSD: 0, _ethNat: 0,   // temp for price calculation
      });
    }

    const s = byDate.get(date);
    s.totalAssetsUSD          += usdAssets;
    s.assetsDepositedTotalUSD += depUSD;
    s.assetsWithdrawnTotalUSD += witUSD;

    if (isEth) {
      s.ethPoolAssetsETH         += natAssets;
      s.ethPoolAssetsUSD         += usdAssets;
      s.ethPoolDepositedTotalETH += depNat;
      s.ethPoolDepositedTotalUSD += depUSD;
      s.ethPoolWithdrawnTotalETH += witNat;
      s.ethPoolWithdrawnTotalUSD += witUSD;
      s._ethUSD += usdAssets;
      s._ethNat += natAssets;
    } else {
      s.usdPoolAssetsUSD         += usdAssets;
      s.usdPoolDepositedTotalUSD += depUSD;
      s.usdPoolWithdrawnTotalUSD += witUSD;
    }

    s.totalSuppliers += Number(dd.totalSuppliers ?? 0);
    s.navPerShare     = Number(dd.navPerShare ?? "1000000000000000000") / DIV_NATIVE;
  }

  // Finalise: compute ETH price, remove temp fields, sort
  const snapshots = [];
  for (const [, s] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    s.ethPriceUSD = s._ethNat > 0 ? s._ethUSD / s._ethNat : 0;
    delete s._ethUSD;
    delete s._ethNat;
    snapshots.push(s);
  }

  return snapshots;
}

// ── Pool summaries ─────────────────────────────────────────────────────────────

/**
 * Build a PoolSummary[] from live pool data + per-pool AutopoolDayData.
 *
 * @param {Array}  rawPools    - output of fetchPools across all chains
 * @param {Array}  allDayData  - raw AutopoolDayData records from all chains
 */
function buildPoolSummaries(rawPools, allDayData, liveEthPrice = null) {
  // Build per-pool day-data lookup: vaultId (lower) → sorted array of day records
  const poolDayMap = new Map();
  for (const dd of allDayData) {
    const vid = dd.vault?.id?.toLowerCase();
    if (!vid) continue;
    if (!poolDayMap.has(vid)) poolDayMap.set(vid, []);
    poolDayMap.get(vid).push(dd);
  }
  // Sort each pool's records ascending by date
  for (const recs of poolDayMap.values()) {
    recs.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  return rawPools.map(p => {
    const isEth      = ETH_TOKENS.has(p.baseAsset?.symbol ?? "");
    const tvlNative  = isEth ? sn(p.totalAssets ?? "0") : su(p.totalAssetsUSD ?? "0");
    const tvlUSD     = isEth && liveEthPrice ? tvlNative * liveEthPrice : su(p.totalAssetsUSD ?? "0");
    const nav        = Number(p.navPerShare ?? "1000000000000000000") / DIV_NATIVE;

    // Per-pool weekly net flow: diff in cumulative deposits/withdrawals over ~7 days
    let weeklyNetFlowUSD    = 0;
    let weeklyNetFlowNative = 0;
    const recs = poolDayMap.get(p.id?.toLowerCase());
    if (recs && recs.length >= 2) {
      const latest  = recs[recs.length - 1];
      // Find the record closest to 7 days before the latest date
      const cutoff  = new Date(latest.date);
      cutoff.setUTCDate(cutoff.getUTCDate() - 7);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      // Pick the last record whose date is <= cutoffStr, or the earliest record
      let ref = recs[0];
      for (const r of recs) {
        if (r.date <= cutoffStr) ref = r;
        else break;
      }
      const depDeltaUSD = su(latest.assetsDepositedTotalUSD ?? "0") - su(ref.assetsDepositedTotalUSD ?? "0");
      const witDeltaUSD = su(latest.assetsWithdrawnTotalUSD ?? "0") - su(ref.assetsWithdrawnTotalUSD ?? "0");
      weeklyNetFlowUSD = depDeltaUSD - witDeltaUSD;
      if (isEth) {
        const depDeltaNat = sn(latest.assetsDepositedTotal ?? "0") - sn(ref.assetsDepositedTotal ?? "0");
        const witDeltaNat = sn(latest.assetsWithdrawnTotal ?? "0") - sn(ref.assetsWithdrawnTotal ?? "0");
        weeklyNetFlowNative = depDeltaNat - witDeltaNat;
        // Use live ETH price for current USD conversion if available
        if (liveEthPrice) weeklyNetFlowUSD = weeklyNetFlowNative * liveEthPrice;
      } else {
        weeklyNetFlowNative = weeklyNetFlowUSD;
      }
    }

    return {
      id:                   p.id,
      name:                 p.name ?? p.symbol,
      symbol:               p.symbol,
      chain:                p.chainName,
      chainId:              p.chainId,
      denom:                isEth ? "ETH" : "USD",
      denomToken:           p.baseAsset?.symbol ?? "?",
      tvlUSD,
      tvlNative,
      weeklyNetFlowUSD,
      weeklyNetFlowNative,
      depositors:           Number(p.totalSuppliers ?? 0),
      navPerShare:          nav,
      paused:               p.paused   ?? false,
      shutdown:             p.shutdown ?? false,
    };
  }).sort((a, b) => b.tvlUSD - a.tvlUSD);
}

// ── Headline events ────────────────────────────────────────────────────────────

/**
 * @param {Array}  recentOps   - normalized ops with { vaultAddress, timestamp, totalNative, symbol }
 * @param {Map}    poolRateMap - pool address (lower) → USD per native unit
 * @param {Array}  history     - DaySnapshot[]
 */
function buildHeadlineEvents(recentOps, poolRateMap, history) {
  const THRESHOLD_USD = 50_000;

  const withUSD = recentOps.map(op => {
    const rate   = poolRateMap.get(op.vaultAddress?.toLowerCase()) ?? 1;
    const amtUSD = Math.abs(op.totalNative) * rate;
    return { ...op, amtUSD };
  });

  const bigDeposits    = withUSD.filter(op => op.totalNative > 0  && op.amtUSD >= THRESHOLD_USD)
                                .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  const bigWithdrawals = withUSD.filter(op => op.totalNative < 0  && op.amtUSD >= THRESHOLD_USD)
                                .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const bigDep = bigDeposits[0]    ?? null;
  const bigWit = bigWithdrawals[0] ?? null;

  let bigTVLDay = { changeUSD: 0, date: history[history.length - 1]?.date ?? "" };
  for (let i = history.length - 1; i >= 1; i--) {
    const change = history[i].totalAssetsUSD - history[i - 1].totalAssetsUSD;
    if (Math.abs(change) >= 100_000) {
      bigTVLDay = { changeUSD: change, date: history[i].date };
      break;
    }
  }

  const toEvent = (op, positive) => op ? {
    amountUSD: op.amtUSD,
    datetime:  new Date(Number(op.timestamp) * 1000).toISOString(),
    pool:      op.symbol ?? "?",
    positive,
  } : null;

  return {
    lastBigDeposit:    toEvent(bigDep,  true),
    lastBigWithdrawal: toEvent(bigWit,  false),
    lastBigTVLDay:     bigTVLDay,
  };
}

// ── Wallet-level analytics ─────────────────────────────────────────────────────

function median(sorted) {
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeGini(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n      = sorted.length;
  const total  = sorted.reduce((s, v) => s + v, 0);
  if (n === 0 || total === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (2 * (i + 1) - n - 1) * sorted[i];
  return sum / (n * total);
}

/**
 * Build all Deposits-tab metrics from raw operations + current holder balances.
 *
 * @param {Array} allOps      - userAutopoolBalanceChange rows (with totalNative pre-computed)
 * @param {Array} allHolders  - Holder rows across all chains
 * @param {Array} history     - DaySnapshot[] (sorted ascending, for context)
 * @param {Map}   poolRateMap - pool address (lower) → USD per native unit
 */
function buildDepositStats(allOps, allHolders, history, poolRateMap) {
  const today   = new Date();
  const todayMs = today.getTime();

  // Wallets with a balance below this threshold are treated as dust and excluded
  // from distribution, Gini, and retention calculations.
  const MIN_BALANCE_USD = 10;

  // ── 1. Current wallet balances (USD) for distribution / Gini ────────────────
  const walletBalancesUSD = allHolders.map(h => {
    const nav    = Number(h.autoPool?.navPerShare ?? "1000000000000000000") / DIV_NATIVE;
    const shares = sn(h.sharesHeld ?? "0");
    const poolId = h.autoPool?.id?.toLowerCase();
    const rate   = poolRateMap.get(poolId) ?? 1;
    return shares * nav * rate;
  }).filter(v => v > 0);

  walletBalancesUSD.sort((a, b) => a - b);

  // Exclude dust wallets from all holder-balance-based metrics
  const walletBalancesFiltered = walletBalancesUSD.filter(v => v >= MIN_BALANCE_USD);

  const totalTVL  = walletBalancesFiltered.reduce((s, v) => s + v, 0);
  const gini      = computeGini(walletBalancesFiltered);
  const medianPos = median(walletBalancesFiltered);
  const meanPos   = totalTVL / (walletBalancesFiltered.length || 1);

  // ── 2. Deposit size distribution buckets ─────────────────────────────────────
  const BUCKETS = [
    { label: "$100–1K",    min: 100,         max: 1_000 },
    { label: "$1K–10K",    min: 1_000,       max: 10_000 },
    { label: "$10K–50K",   min: 10_000,      max: 50_000 },
    { label: "$50K–100K",  min: 50_000,      max: 100_000 },
    { label: "$100K–500K", min: 100_000,     max: 500_000 },
    { label: "$500K–1M",   min: 500_000,     max: 1_000_000 },
    { label: "$1M+",       min: 1_000_000,   max: Infinity },
  ];
  const depositDistribution = BUCKETS.map(b => ({
    label: b.label,
    count: walletBalancesFiltered.filter(v => v >= b.min && v < b.max).length,
  }));

  // ── 3. Group operations by wallet ────────────────────────────────────────────
  // walletId → { ops: sorted operations, firstDepositMs, lastExitMs, ... }
  const walletMap = new Map();

  for (const op of allOps) {
    const walletId = op.walletAddress;
    if (!walletId) continue;
    const rate   = poolRateMap.get(op.vaultAddress?.toLowerCase()) ?? 1;
    const amtUSD = Math.abs(op.totalNative) * rate;
    const type   = op.totalNative >= 0 ? "DEPOSIT" : "WITHDRAWAL";
    const tsMs   = Number(op.timestamp) * 1000;

    if (!walletMap.has(walletId)) {
      walletMap.set(walletId, {
        id: walletId,
        ops: [],
        firstDepositMs:     null,
        firstDepositAmtUSD: 0,
        lastExitMs:         null,
        hasFullyExited:     false,
        hasRedeposited:     false,
        depositCount:       0,
        runningBalance:     0,
      });
    }
    const w = walletMap.get(walletId);
    w.ops.push({ type, amtUSD, tsMs });
  }

  // Process each wallet's ops in chronological order
  for (const w of walletMap.values()) {
    w.ops.sort((a, b) => a.tsMs - b.tsMs);

    let balance = 0;
    let fullyExited = false;

    for (const op of w.ops) {
      if (op.type === "DEPOSIT") {
        if (w.firstDepositMs === null) {
          w.firstDepositMs      = op.tsMs;
          w.firstDepositAmtUSD  = op.amtUSD;
        }
        if (fullyExited) {
          w.hasRedeposited = true;
          fullyExited = false;
        }
        w.depositCount++;
        balance += op.amtUSD;
      } else {
        balance -= op.amtUSD;
        if (balance <= 0) {
          balance = 0;
          if (!fullyExited && w.firstDepositMs !== null) {
            w.lastExitMs     = op.tsMs;
            w.hasFullyExited = true;
            fullyExited      = true;
          }
        }
      }
    }
  }

  // ── 4. Hold time stats ────────────────────────────────────────────────────────
  const holdDays = [];
  for (const w of walletMap.values()) {
    if (w.hasFullyExited && w.firstDepositMs && w.lastExitMs) {
      holdDays.push((w.lastExitMs - w.firstDepositMs) / (1000 * 60 * 60 * 24));
    }
  }
  holdDays.sort((a, b) => a - b);
  const holdTime = {
    medianDays: Math.round(median(holdDays)),
    meanDays:   Math.round(holdDays.reduce((s, v) => s + v, 0) / (holdDays.length || 1)),
  };

  // ── 5. Churn rate ─────────────────────────────────────────────────────────────
  // % of wallets with first deposit in last 6 months that exited within N days
  const sixMonthsAgoMs = todayMs - 180 * 24 * 60 * 60 * 1000;
  const recentWallets  = [...walletMap.values()].filter(
    w => w.firstDepositMs !== null && w.firstDepositMs >= sixMonthsAgoMs
  );

  const churnWithin = (days) => {
    const limitMs = days * 24 * 60 * 60 * 1000;
    const churned = recentWallets.filter(
      w => w.hasFullyExited && (w.lastExitMs - w.firstDepositMs) <= limitMs
    ).length;
    return recentWallets.length ? Math.round((churned / recentWallets.length) * 100) : 0;
  };
  const churn = { d30: churnWithin(30), d60: churnWithin(60), d90: churnWithin(90) };

  // ── 6. Re-deposit rate ────────────────────────────────────────────────────────
  const exitedWallets   = [...walletMap.values()].filter(w => w.hasFullyExited);
  const redepositRate   = exitedWallets.length
    ? Math.round((exitedWallets.filter(w => w.hasRedeposited).length / exitedWallets.length) * 100)
    : 0;

  // ── 7. Median deposit count per wallet ────────────────────────────────────────
  const depositCounts = [...walletMap.values()]
    .filter(w => w.depositCount > 0)
    .map(w => w.depositCount)
    .sort((a, b) => a - b);
  const medianDepositCount = Math.round(median(depositCounts) * 10) / 10;

  // ── 8. Depositor stats ────────────────────────────────────────────────────────
  // "Since inception" = all first-deposit amounts
  const firstDeposits = [...walletMap.values()]
    .filter(w => w.firstDepositAmtUSD > 0)
    .map(w => w.firstDepositAmtUSD)
    .sort((a, b) => a - b);

  const depositorStatsInception = {
    medianDepositUSD: Math.round(median(firstDeposits)),
    meanDepositUSD:   Math.round(firstDeposits.reduce((s, v) => s + v, 0) / (firstDeposits.length || 1)),
  };
  const depositorStatsCurrent = {
    medianDepositUSD: Math.round(medianPos),
    meanDepositUSD:   Math.round(meanPos),
  };

  // ── 9. Cohort retention heatmap ───────────────────────────────────────────────
  // Pre-compute holder balance map (used in retention and conviction sections)
  const holderBalanceByWallet = new Map();
  for (const h of allHolders) {
    const walletId = h.user?.id?.toLowerCase();
    if (!walletId) continue;
    const nav    = Number(h.autoPool?.navPerShare ?? "1000000000000000000") / DIV_NATIVE;
    const shares = sn(h.sharesHeld ?? "0");
    const poolId = h.autoPool?.id?.toLowerCase();
    const rate   = poolRateMap.get(poolId) ?? 1;
    holderBalanceByWallet.set(walletId, (holderBalanceByWallet.get(walletId) ?? 0) + shares * nav * rate);
  }

  const cohortMap = new Map(); // "MMM YY" → [walletFirstDepositMs]
  for (const w of walletMap.values()) {
    if (w.firstDepositMs === null) continue;
    const d    = new Date(w.firstDepositMs);
    const mon  = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    const yr   = String(d.getUTCFullYear()).slice(2);
    const key  = `${mon} ${yr}`;
    if (!cohortMap.has(key)) cohortMap.set(key, []);
    cohortMap.get(key).push(w);
  }

  const retentionCohorts = [];
  for (const [label, wallets] of cohortMap) {
    const cohortFirstMs = Math.min(...wallets.map(w => w.firstDepositMs));
    const stillHolding  = (atDaysMs) => {
      const cutoff = cohortFirstMs + atDaysMs;
      if (cutoff > todayMs) return null; // window hasn't elapsed
      // A wallet is "still holding" if it has NOT fully exited by that point.
      // Dust wallets (balance < MIN_BALANCE_USD) are treated as effectively exited.
      const count = wallets.filter(w => {
        if (w.hasFullyExited) return w.lastExitMs > cutoff;
        const bal = holderBalanceByWallet.get(w.id.toLowerCase()) ?? 0;
        return bal >= MIN_BALANCE_USD;
      }).length;
      return wallets.length ? Math.round((count / wallets.length) * 100) : null;
    };

    retentionCohorts.push({
      label,
      d30:  stillHolding(30  * 86400e3),
      d60:  stillHolding(60  * 86400e3),
      d90:  stillHolding(90  * 86400e3),
      d180: stillHolding(180 * 86400e3),
    });
  }
  // Sort chronologically (most recent last)
  retentionCohorts.sort((a, b) => {
    const MONS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const parse = l => { const [m, y] = l.split(" "); return parseInt(y) * 12 + MONS.indexOf(m); };
    return parse(a.label) - parse(b.label);
  });

  // ── 10. Churn waterfall ───────────────────────────────────────────────────────
  // Monthly new-depositor TVL inflow vs. exited TVL by that cohort
  const MONS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const waterfallMap = new Map();

  for (const w of walletMap.values()) {
    if (w.firstDepositMs === null) continue;
    const d    = new Date(w.firstDepositMs);
    const mon  = MONS_SHORT[d.getUTCMonth()];
    const yr   = String(d.getUTCFullYear()).slice(2);
    const key  = `${mon} ${yr}`;
    if (!waterfallMap.has(key)) waterfallMap.set(key, { label: key, inflow: 0, outflow: 0, _order: d.getUTCFullYear() * 12 + d.getUTCMonth() });
    waterfallMap.get(key).inflow += w.firstDepositAmtUSD;
    if (w.hasFullyExited) {
      waterfallMap.get(key).outflow -= w.firstDepositAmtUSD; // exited TVL as negative
    }
  }

  const churnWaterfall = [...waterfallMap.values()]
    .sort((a, b) => a._order - b._order)
    .map(({ label, inflow, outflow }) => ({
      label: label + (isCurrentMonth(label, today) ? "*" : ""),
      inflow:  Math.round(inflow),
      outflow: Math.round(outflow),
    }));

  // ── 11. Cohort conviction (position size change by join cohort) ───────────────
  // holderBalanceByWallet is already built in section 9 above
  const convictionCohorts = new Map();
  const COHORT_WINDOWS = [
    { label: "0–3 mo",  minMonths: 0,  maxMonths: 3  },
    { label: "3–6 mo",  minMonths: 3,  maxMonths: 6  },
    { label: "6–9 mo",  minMonths: 6,  maxMonths: 9  },
    { label: "9–12 mo", minMonths: 9,  maxMonths: 12 },
  ];

  for (const win of COHORT_WINDOWS) {
    const minMs = win.minMonths * 30 * 86400e3;
    const maxMs = win.maxMonths * 30 * 86400e3;
    const cohortWallets = [...walletMap.values()].filter(w => {
      if (w.firstDepositMs === null) return false;
      const age = todayMs - w.firstDepositMs;
      return age >= minMs && age < maxMs;
    });
    const changes = cohortWallets
      .filter(w => w.firstDepositAmtUSD > 0)
      .map(w => {
        const current = holderBalanceByWallet.get(w.id.toLowerCase()) ?? 0;
        if (current === 0) return null;
        return ((current - w.firstDepositAmtUSD) / w.firstDepositAmtUSD) * 100;
      })
      .filter(v => v !== null);
    changes.sort((a, b) => a - b);
    convictionCohorts.set(win.label, {
      label:     win.label,
      changePct: Math.round(median(changes)),
      wallets:   cohortWallets.length,
    });
  }
  const cohortConviction = COHORT_WINDOWS.map(w => convictionCohorts.get(w.label)).filter(Boolean).reverse();

  // ── 12. Retention by deposit tier (survival curves) ───────────────────────────
  // For each tier, track % of wallets still holding at N days
  const TIER_KEYS = ["t1","t2","t3","t4","t5","t6","t7"];
  const TIER_BUCKETS = [
    { key: "t1", min: 100,       max: 1_000 },
    { key: "t2", min: 1_000,     max: 10_000 },
    { key: "t3", min: 10_000,    max: 50_000 },
    { key: "t4", min: 50_000,    max: 100_000 },
    { key: "t5", min: 100_000,   max: 500_000 },
    { key: "t6", min: 500_000,   max: 1_000_000 },
    { key: "t7", min: 1_000_000, max: Infinity },
  ];
  const DAY_POINTS = [0, 30, 60, 90, 120, 180, 240, 300, 365];

  const retentionByTier = DAY_POINTS.map(day => {
    const point = { day };
    for (const tier of TIER_BUCKETS) {
      const tierWallets = [...walletMap.values()].filter(w =>
        w.firstDepositAmtUSD >= tier.min && w.firstDepositAmtUSD < tier.max
      );
      if (tierWallets.length === 0) { point[tier.key] = 0; continue; }
      if (day === 0) { point[tier.key] = 100; continue; }
      const limitMs = day * 86400e3;
      const surviving = tierWallets.filter(w => {
        if (w.hasFullyExited) return (w.lastExitMs - w.firstDepositMs) > limitMs;
        const bal = holderBalanceByWallet.get(w.id.toLowerCase()) ?? 0;
        return bal >= MIN_BALANCE_USD;
      });
      point[tier.key] = Math.round((surviving.length / tierWallets.length) * 100);
    }
    return point;
  });

  return {
    depositorStatsInception,
    depositorStatsCurrent,
    medianDepositCount,
    depositDistribution,
    cohortConviction,
    retentionByTier,
    churnWaterfall,
    retentionCohorts,
    holdTime,
    churn,
    redepositRate,
    walletBalances: walletBalancesFiltered,
    gini,
  };
}

function isCurrentMonth(label, today) {
  const MONS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [mon, yr] = label.replace("*","").split(" ");
  return MONS.indexOf(mon) === today.getUTCMonth() && parseInt(yr) === today.getUTCFullYear() % 100;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function fetchEthPrice() {
  try {
    const res  = await fetch(COINBASE_ETH_PRICE_URL);
    const json = await res.json();
    const price = parseFloat(json?.data?.amount);
    if (!isFinite(price) || price <= 0) throw new Error("invalid price");
    return price;
  } catch (e) {
    console.warn(`  Could not fetch live ETH price from Coinbase: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log("=== Autopool Stats Fetch ===");
  console.log(`Subgraph base: ${SUBGRAPH_BASE}`);
  console.log(`Output dir:   ${OUT_DIR}`);

  const now       = new Date();
  const sinceDate = new Date(now);
  sinceDate.setDate(sinceDate.getDate() - HISTORY_DAYS);
  const sinceDateStr = sinceDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // ── 0. Fetch live ETH price ───────────────────────────────────────────────────
  console.log("\n[0/5] Fetching live ETH price from Coinbase…");
  const liveEthPrice = await fetchEthPrice();
  console.log(`  ETH/USD: ${liveEthPrice ? `$${liveEthPrice.toFixed(2)}` : "unavailable (will use implied price)"}`);

  // ── 1. Fetch pool metadata across all chains ─────────────────────────────────
  console.log("\n[1/5] Fetching pool metadata…");
  const allRawPools = [];
  for (const chain of CHAINS) {
    try {
      const pools = await fetchPools(chain.id);
      console.log(`  chain=${chain.id} found ${pools.length} pools`);
      allRawPools.push(...pools);
    } catch (e) {
      console.warn(`  chain=${chain.id} pools error: ${e.message}`);
    }
  }

  // Build pool lookup map (by id)
  const poolMap = new Map(allRawPools.map(p => [p.id, p]));

  // Build pool rate map (pool address lower → USD per native unit)
  const poolRateMap = new Map();
  for (const p of allRawPools) {
    const totalUSD = su(p.totalAssetsUSD ?? "0");
    const totalNat = sn(p.totalAssets    ?? "0");
    if (totalNat > 0) poolRateMap.set(p.id.toLowerCase(), totalUSD / totalNat);
  }

  // ── 2. Fetch AutopoolDayData ─────────────────────────────────────────────────
  console.log("\n[2/5] Fetching day data…");
  const allDayData = [];
  for (const chain of CHAINS) {
    try {
      const dd = await fetchDayData(chain.id, sinceDateStr);
      console.log(`  chain=${chain.id} found ${dd.length} day-data rows`);
      allDayData.push(...dd);
    } catch (e) {
      console.warn(`  chain=${chain.id} day data error: ${e.message}`);
    }
  }

  // ── 3. Fetch recent ops for headline events ───────────────────────────────────
  console.log("\n[3/5] Fetching headline events…");
  const allRecentOps = [];
  for (const chain of CHAINS) {
    try {
      const raw = await fetchRecentOps(chain.id);
      const normalized = raw.map(op => ({
        ...op,
        totalNative: (op.items ?? []).reduce((sum, item) => sum + sn(item.assetChange ?? "0"), 0),
        symbol: poolMap.get(op.vaultAddress)?.symbol ?? op.vaultAddress?.slice(0, 8),
      }));
      console.log(`  chain=${chain.id} found ${normalized.length} recent ops`);
      allRecentOps.push(...normalized);
    } catch (e) {
      console.warn(`  chain=${chain.id} recent ops error: ${e.message}`);
    }
  }

  // ── 4. Fetch all operations + holders (for wallet analytics) ──────────────────
  console.log("\n[4/5] Fetching all operations + holders…");
  const allOps     = [];
  const allHolders = [];
  for (const chain of CHAINS) {
    try {
      const raw = await fetchAllOperations(chain.id);
      const normalized = raw.map(op => ({
        ...op,
        totalNative: (op.items ?? []).reduce((sum, item) => sum + sn(item.assetChange ?? "0"), 0),
      }));
      console.log(`  chain=${chain.id} found ${normalized.length} operations`);
      allOps.push(...normalized);
    } catch (e) {
      console.warn(`  chain=${chain.id} operations error: ${e.message}`);
    }
    try {
      const holders = await fetchHolders(chain.id);
      console.log(`  chain=${chain.id} found ${holders.length} holders`);
      allHolders.push(...holders);
    } catch (e) {
      console.warn(`  chain=${chain.id} holders error: ${e.message}`);
    }
  }

  // ── 5. Compute and write output ───────────────────────────────────────────────
  console.log("\n[5/5] Computing metrics and writing JSON…");

  const history  = buildHistory(allDayData, poolMap);

  // Patch the most recent snapshot with the live ETH price
  if (liveEthPrice && history.length > 0) {
    const last = history[history.length - 1];
    last.ethPriceUSD      = liveEthPrice;
    last.ethPoolAssetsUSD = last.ethPoolAssetsETH * liveEthPrice;
    last.totalAssetsUSD   = last.usdPoolAssetsUSD + last.ethPoolAssetsUSD;
  }

  const pools    = buildPoolSummaries(allRawPools, allDayData, liveEthPrice);
  const events   = buildHeadlineEvents(allRecentOps, poolRateMap, history);
  const deposits = buildDepositStats(allOps, allHolders, history, poolRateMap);

  const generatedAt = now.toISOString();

  // protocol-data.json
  const protocolData = {
    generatedAt,
    history,
    pools,
    lastBigDeposit:    events.lastBigDeposit,
    lastBigWithdrawal: events.lastBigWithdrawal,
    lastBigTVLDay:     events.lastBigTVLDay,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "protocol-data.json"),
    JSON.stringify(protocolData),
  );
  console.log(`  ✓ protocol-data.json (${history.length} days, ${pools.length} pools)`);

  // deposits-stats.json
  fs.writeFileSync(
    path.join(OUT_DIR, "deposits-stats.json"),
    JSON.stringify({ generatedAt, ...deposits }),
  );
  console.log(`  ✓ deposits-stats.json (${allHolders.length} holders, ${allOps.length} ops)`);

  console.log("\nDone.");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
