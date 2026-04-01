import { useState, useEffect, useMemo } from "react";
import { Loader2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, LogOut } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useTradovate } from "@/contexts/TradovateContext";
import {
  fetchAccounts,
  fetchTrades,
  type TradovateAccount,
  type TradovateTrade,
} from "@/lib/tradovate-api";
import { toast } from "@/hooks/use-toast";

type SortKey = "timestamp" | "symbol" | "side" | "qty" | "price" | "pnl";
type SortDir = "asc" | "desc";

export function Dashboard() {
  const { session, disconnect } = useTradovate();
  const [accounts, setAccounts] = useState<TradovateAccount[]>([]);
  const [trades, setTrades] = useState<TradovateTrade[] | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Auto-load accounts
  useEffect(() => {
    if (!session) return;
    fetchAccounts(session)
      .then(setAccounts)
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setIsLoadingAccounts(false));
  }, [session]);

  const handleFetchTrades = async () => {
    if (!session) return;
    setIsLoadingTrades(true);
    try {
      const data = await fetchTrades(session);
      setTrades(data);
      setHasFetched(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingTrades(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "timestamp" ? "desc" : "asc");
    }
  };

  const sortedTrades = useMemo(() => {
    if (!trades) return [];
    return [...trades].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === "string" && typeof valB === "string") return valA.localeCompare(valB) * dir;
      if (typeof valA === "number" && typeof valB === "number") return (valA - valB) * dir;
      return 0;
    });
  }, [trades, sortKey, sortDir]);

  // Stats
  const stats = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    const buys = trades.filter((t) => t.side === "Buy").length;
    const sells = trades.filter((t) => t.side === "Sell").length;
    const pnlTrades = trades.filter((t) => t.pnl !== null);
    const netPnl = pnlTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    return { total: trades.length, buys, sells, netPnl, hasPnl: pnlTrades.length > 0 };
  }, [trades]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const formatPnl = (pnl: number | null) => {
    if (pnl === null) return <span className="text-muted-foreground">—</span>;
    const color = pnl >= 0 ? "text-terminal-green" : "text-terminal-red";
    const sign = pnl >= 0 ? "+" : "";
    return <span className={color}>{sign}${pnl.toFixed(2)}</span>;
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return "—";
    try {
      return format(new Date(ts), "MMM d, yyyy HH:mm:ss");
    } catch {
      return ts;
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary font-semibold text-sm uppercase tracking-[0.15em]">
            Terminal
          </span>
          <span className="text-muted-foreground text-sm">|</span>
          <span className="terminal-label text-foreground">Tradovate Journal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            User: <span className="text-foreground">{session.name}</span>
          </span>
          <span
            className={`text-xs uppercase tracking-[0.15em] px-2 py-0.5 rounded border ${
              session.environment === "live"
                ? "border-terminal-red/30 text-terminal-red"
                : "border-primary/30 text-primary"
            }`}
          >
            {session.environment}
          </span>
          <Button variant="terminal-danger" size="sm" onClick={disconnect}>
            <LogOut className="h-3 w-3" />
            Disconnect
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Accounts bar */}
        <div>
          <h2 className="terminal-label mb-3">Accounts</h2>
          {isLoadingAccounts ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-muted-foreground text-xs">No accounts found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map((acc) => (
                <span
                  key={acc.id}
                  className="text-xs px-3 py-1.5 rounded border border-border bg-secondary text-foreground"
                >
                  {acc.name} <span className="text-muted-foreground">#{acc.id}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Fetch Trades */}
        <div className="flex items-center gap-4">
          <Button
            variant="terminal"
            size="lg"
            onClick={handleFetchTrades}
            disabled={isLoadingTrades}
          >
            {isLoadingTrades ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : hasFetched ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh Trades
              </>
            ) : (
              "Fetch Trades"
            )}
          </Button>
          {trades && (
            <span className="text-xs text-muted-foreground">
              {trades.length} fills found
            </span>
          )}
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Fills" value={stats.total.toString()} />
            <StatCard label="Buys" value={stats.buys.toString()} variant="green" />
            <StatCard label="Sells" value={stats.sells.toString()} variant="red" />
            {stats.hasPnl && (
              <StatCard
                label="Net P&L"
                value={`${stats.netPnl >= 0 ? "+" : ""}$${stats.netPnl.toFixed(2)}`}
                variant={stats.netPnl >= 0 ? "green" : "red"}
              />
            )}
          </div>
        )}

        {/* Trades Table */}
        {isLoadingTrades && !trades && (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Fetching trade history…</span>
          </div>
        )}

        {trades && trades.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No fills found.</div>
        )}

        {trades && trades.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {(
                      [
                        ["timestamp", "Timestamp"],
                        ["symbol", "Symbol"],
                        ["side", "Side"],
                        ["qty", "Qty"],
                        ["price", "Price"],
                        ["pnl", "P&L"],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left cursor-pointer select-none hover:text-primary transition-colors"
                        onClick={() => toggleSort(key)}
                      >
                        <span className="terminal-label flex items-center gap-1.5">
                          {label}
                          <SortIcon column={key} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTrades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(trade.timestamp)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {trade.symbol ?? (
                          <span className="text-muted-foreground">#{trade.contractId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${
                            trade.side === "Buy"
                              ? "bg-terminal-green/10 text-terminal-green"
                              : "bg-terminal-red/10 text-terminal-red"
                          }`}
                        >
                          {trade.side === "Buy" ? "↑" : "↓"} {trade.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{trade.qty}</td>
                      <td className="px-4 py-3 text-foreground">
                        {trade.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3">{formatPnl(trade.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "green" | "red";
}) {
  const valueColor =
    variant === "green"
      ? "text-terminal-green"
      : variant === "red"
        ? "text-terminal-red"
        : "text-foreground";

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="terminal-label mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}
