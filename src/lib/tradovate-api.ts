// Tradovate API client — routes through Vercel rewrite proxy to avoid CORS.
// In dev (Lovable preview), calls Tradovate directly as a fallback.

const TRADOVATE_CID = 8;
const TRADOVATE_SEC = "f03741b6-f634-48d6-9308-c8fb871150c2";
const TRADOVATE_APP_ID = "Sample App";
const TRADOVATE_APP_VERSION = "1.0";

// Proxy paths (Vercel rewrites these to Tradovate)
const BASE_URLS = {
  demo: "/api/tradovate/demo",
  live: "/api/tradovate/live",
} as const;

export type Environment = "demo" | "live";

export interface TradovateSession {
  accessToken: string;
  environment: Environment;
  userId: number;
  name: string;
  expirationTime: string | null;
}

export interface TradovateAccount {
  id: number;
  name: string;
  userId: number;
  accountType: string | null;
  active: boolean | null;
}

export interface TradovateTrade {
  id: number;
  orderId: number;
  contractId: number;
  symbol: string | null;
  side: "Buy" | "Sell";
  qty: number;
  price: number;
  timestamp: string | null;
  tradeDate: string | null;
  pnl: number | null;
}

export async function connectTradovate(
  name: string,
  password: string,
  environment: Environment
): Promise<TradovateSession> {
  const baseUrl = BASE_URLS[environment];
  const deviceId = crypto.randomUUID();

  const res = await fetch(`${baseUrl}/auth/accesstokenrequest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name,
      password,
      appId: TRADOVATE_APP_ID,
      appVersion: TRADOVATE_APP_VERSION,
      cid: TRADOVATE_CID,
      sec: TRADOVATE_SEC,
      deviceId,
    }),
  });

  if (!res.ok) {
    throw new Error("Authentication failed — check your username and password");
  }

  const data = await res.json();

  if (!data.accessToken) {
    if (data["p-captcha"] || data["p-ticket"]) {
      const pMsg = data["p-message"] ?? "Too many login attempts";
      throw new Error(`${pMsg}. Please wait before trying again.`);
    }
    const errorText =
      data.errorText ?? data.failedText ?? data["p-message"] ?? "Invalid credentials";
    throw new Error(errorText);
  }

  return {
    accessToken: data.accessToken,
    environment,
    userId: data.userId ?? 0,
    name: data.name ?? name,
    expirationTime:
      data.expirationTime ?? new Date(Date.now() + 90 * 60 * 1000).toISOString(),
  };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

export async function fetchAccounts(session: TradovateSession): Promise<TradovateAccount[]> {
  const baseUrl = BASE_URLS[session.environment];
  const res = await fetch(`${baseUrl}/account/list`, {
    headers: authHeaders(session.accessToken),
  });

  if (!res.ok) throw new Error("Failed to fetch accounts — session may have expired");

  const raw = await res.json();
  return (Array.isArray(raw) ? raw : []).map((a: any) => ({
    id: a.id,
    name: a.name,
    userId: a.userId,
    accountType: a.accountType ?? null,
    active: a.active ?? null,
  }));
}

export async function fetchTrades(session: TradovateSession): Promise<TradovateTrade[]> {
  const baseUrl = BASE_URLS[session.environment];
  const headers = authHeaders(session.accessToken);

  const [fillsRes, contractsRes, fillPairsRes] = await Promise.all([
    fetch(`${baseUrl}/fill/list`, { headers }),
    fetch(`${baseUrl}/contract/list`, { headers }),
    fetch(`${baseUrl}/fillPair/list`, { headers }),
  ]);

  if (!fillsRes.ok) throw new Error("Failed to fetch trades — session may have expired");

  const fills = await fillsRes.json();
  const contracts = contractsRes.ok ? await contractsRes.json() : [];
  const fillPairs = fillPairsRes.ok ? await fillPairsRes.json() : [];

  const contractMap = new Map<number, string>(
    (Array.isArray(contracts) ? contracts : []).map((c: any) => [c.id, c.name])
  );

  const pnlByFillId = new Map<number, number>();
  for (const fp of Array.isArray(fillPairs) ? fillPairs : []) {
    const pnl = fp.realizedPnl !== undefined ? fp.realizedPnl : (fp.sellPrice - fp.buyPrice) * fp.qty;
    pnlByFillId.set(fp.buyFillId, pnl);
    pnlByFillId.set(fp.sellFillId, pnl);
  }

  const allFills = Array.isArray(fills) ? fills : [];

  const trades: TradovateTrade[] = allFills.map((fill: any) => {
    let tradeDate: string | null = null;
    if (fill.tradeDate) {
      const td = fill.tradeDate;
      tradeDate = `${td.year}-${String(td.month).padStart(2, "0")}-${String(td.day).padStart(2, "0")}`;
    } else if (fill.timestamp) {
      tradeDate = fill.timestamp.split("T")[0] ?? null;
    }

    return {
      id: fill.id,
      orderId: fill.orderId,
      contractId: fill.contractId,
      symbol: contractMap.get(fill.contractId) ?? null,
      side: fill.action === "Buy" ? ("Buy" as const) : ("Sell" as const),
      qty: fill.qty,
      price: fill.price,
      timestamp: fill.timestamp ?? null,
      tradeDate,
      pnl: pnlByFillId.get(fill.id) ?? null,
    };
  });

  trades.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return b.timestamp.localeCompare(a.timestamp);
  });

  return trades;
}
