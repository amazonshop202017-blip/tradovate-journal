import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { TradovateSession } from "@/lib/tradovate-api";

interface TradovateContextValue {
  session: TradovateSession | null;
  setSession: (s: TradovateSession | null) => void;
  disconnect: () => void;
  isCheckingSession: boolean;
}

const TradovateContext = createContext<TradovateContextValue | null>(null);

export function TradovateProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<TradovateSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // On mount, nothing to restore (token is in-memory only)
  useEffect(() => {
    setIsCheckingSession(false);
  }, []);

  const disconnect = useCallback(() => {
    setSession(null);
  }, []);

  return (
    <TradovateContext.Provider value={{ session, setSession, disconnect, isCheckingSession }}>
      {children}
    </TradovateContext.Provider>
  );
}

export function useTradovate() {
  const ctx = useContext(TradovateContext);
  if (!ctx) throw new Error("useTradovate must be used within TradovateProvider");
  return ctx;
}
