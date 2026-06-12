import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useLang } from "@/lib/lang-context";
import { LangSwitch, PhoneFrame } from "@/components/package-ui";
import { Package as PackageIcon } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Paketly" },
      { name: "description", content: "Sign in to Paketly to track your packages." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn.call(supabase.auth, {
        email,
        password,
        ...(mode === "signup"
          ? { options: { emailRedirectTo: window.location.origin } }
          : {}),
      } as any);
      if (error) throw error;
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message || "Google sign in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <PhoneFrame>
      <div className="px-6 pt-10 pb-8 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <PackageIcon className="size-5" />
            </div>
            <div className="font-bold text-lg">Paketly</div>
          </div>
          <LangSwitch />
        </div>
        <h1 className="text-2xl font-bold mt-6">
          {mode === "signin"
            ? lang === "sv" ? "Logga in" : "Sign in"
            : lang === "sv" ? "Skapa konto" : "Create account"}
        </h1>
        <p className="text-sm opacity-80 mt-1">
          {lang === "sv" ? "Spåra dina paket i realtid" : "Track your packages in real time"}
        </p>
      </div>

      <div className="flex-1 px-6 py-6 space-y-4">
        <button
          onClick={onGoogle}
          disabled={loading}
          className="w-full py-3 rounded-2xl border border-border bg-card font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          {lang === "sv" ? "Fortsätt med Google" : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" />
          {lang === "sv" ? "eller" : "or"}
          <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder={lang === "sv" ? "Lösenord (min 8 tecken)" : "Password (min 8 chars)"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && <div className="text-sm text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl text-primary-foreground font-bold shadow-[var(--shadow-glow)] disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {loading
              ? "..."
              : mode === "signin"
                ? lang === "sv" ? "Logga in" : "Sign in"
                : lang === "sv" ? "Skapa konto" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? lang === "sv" ? "Inget konto? Skapa ett" : "No account? Create one"
            : lang === "sv" ? "Har du redan ett konto? Logga in" : "Already have an account? Sign in"}
        </button>
      </div>
    </PhoneFrame>
  );
}
