import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTradovate } from "@/contexts/TradovateContext";
import { connectTradovate, type Environment } from "@/lib/tradovate-api";
import { toast } from "@/hooks/use-toast";

const loginSchema = z.object({
  name: z.string().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(255),
  environment: z.enum(["demo", "live"]),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const { setSession } = useTradovate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { name: "", password: "", environment: "demo" },
  });

  const environment = watch("environment");

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const session = await connectTradovate(data.name, data.password, data.environment);
      setSession(session);
      toast({ title: "Connected", description: `Authenticated as ${session.name}` });
    } catch (err: any) {
      toast({ title: "Connection Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg p-8 terminal-glow">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="h-5 w-5 text-primary" />
            <h1 className="terminal-label text-primary text-base">Connect Tradovate</h1>
          </div>
          <p className="text-muted-foreground text-xs mb-8">
            Enter your Tradovate username and password. Credentials are sent directly to Tradovate's API.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Environment Toggle */}
            <div>
              <label className="terminal-label block mb-3">Environment</label>
              <div className="flex gap-2">
                {(["demo", "live"] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setValue("environment", env)}
                    className={`flex-1 py-2 px-4 rounded text-xs uppercase tracking-[0.15em] font-medium border transition-colors ${
                      environment === env
                        ? "bg-primary/15 border-primary text-primary"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="name" className="terminal-label block mb-2">
                Username
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="tradovate username"
                className="bg-secondary border-border font-mono text-sm"
                autoComplete="username"
              />
              {errors.name && (
                <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="terminal-label block mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="••••••••"
                className="bg-secondary border-border font-mono text-sm"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="terminal"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Tradovate"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
