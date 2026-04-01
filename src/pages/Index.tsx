import { TradovateProvider, useTradovate } from "@/contexts/TradovateContext";
import { LoginScreen } from "@/components/LoginScreen";
import { Dashboard } from "@/components/Dashboard";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { session, isCheckingSession } = useTradovate();

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return session ? <Dashboard /> : <LoginScreen />;
}

const Index = () => (
  <TradovateProvider>
    <AppContent />
  </TradovateProvider>
);

export default Index;
