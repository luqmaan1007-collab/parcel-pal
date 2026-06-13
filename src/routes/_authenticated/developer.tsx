import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Key, Loader2, Plus, Trash2, Check } from "lucide-react";
import { PhoneFrame } from "@/components/package-ui";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api-keys.functions";
import { useLang } from "@/lib/lang-context";

export const Route = createFileRoute("/_authenticated/developer")({
  head: () => ({ meta: [{ title: "Developer — Paketly" }] }),
  component: DeveloperPage,
});

function DeveloperPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => listApiKeys(),
  });

  const create = useMutation({
    mutationFn: () => createApiKey({ data: { name: name.trim() } }),
    onSuccess: (r) => {
      setNewKey(r.fullKey);
      setName("");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeApiKey({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const baseUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/v1` : "/api/public/v1";

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <PhoneFrame>
      <div className="px-6 pt-8 pb-6 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <Link to="/" className="inline-flex items-center gap-2 text-sm opacity-90">
          <ArrowLeft className="size-4" /> {lang === "sv" ? "Tillbaka" : "Back"}
        </Link>
        <h1 className="text-2xl font-bold mt-4">Developer</h1>
        <p className="text-sm opacity-80 mt-1">
          {lang === "sv"
            ? "Skicka paket direkt till ditt Paketly-konto från din butik eller automation."
            : "Push packages directly into your Paketly account from your store or automation."}
        </p>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
        {/* Endpoint */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {lang === "sv" ? "Bas-URL" : "Base URL"}
          </h2>
          <div className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between gap-2">
            <code className="text-xs font-mono truncate">{baseUrl}</code>
            <button onClick={() => copy(baseUrl)} className="size-8 rounded-lg bg-muted grid place-items-center shrink-0">
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            </button>
          </div>
        </section>

        {/* New key reveal */}
        {newKey && (
          <section className="rounded-2xl border border-success/30 bg-success/5 p-4 space-y-2">
            <div className="text-sm font-semibold text-success">
              {lang === "sv" ? "Spara nyckeln nu — visas bara en gång" : "Save this key now — shown only once"}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono break-all bg-background rounded-lg p-2 border border-border">
                {newKey}
              </code>
              <button onClick={() => copy(newKey)} className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
                <Copy className="size-4" />
              </button>
            </div>
            <button onClick={() => setNewKey(null)} className="text-xs text-muted-foreground underline">
              {lang === "sv" ? "Stäng" : "Dismiss"}
            </button>
          </section>
        )}

        {/* Keys list */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API keys</h2>
            <button
              onClick={() => setShowNew(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-full text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus className="size-3 inline -mt-0.5" /> {lang === "sv" ? "Ny nyckel" : "New key"}
            </button>
          </div>

          {isLoading && (
            <div className="grid place-items-center py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!isLoading && keys.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {lang === "sv" ? "Inga nycklar än." : "No keys yet."}
            </div>
          )}

          {keys.map((k) => (
            <div key={k.id} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <Key className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{k.name}</div>
                <div className="text-[11px] font-mono text-muted-foreground">{k.key_prefix}…</div>
              </div>
              <button
                onClick={() => revoke.mutate(k.id)}
                className="size-8 rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive grid place-items-center shrink-0"
                aria-label="Revoke"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </section>

        {/* Docs */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {lang === "sv" ? "Skicka ett paket" : "Send a package"}
          </h2>
          <pre className="rounded-2xl bg-card border border-border p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">{`curl -X POST ${baseUrl}/packages \\
  -H "Authorization: Bearer pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "tracking_number": "RR123456785SE",
    "carrier": "postnord",
    "store_name": "My Shop",
    "order_reference": "1042",
    "sender": "My Shop AB"
  }'`}</pre>
          <details className="rounded-2xl bg-card border border-border p-3 text-xs">
            <summary className="cursor-pointer font-semibold">
              {lang === "sv" ? "Fält" : "Fields"}
            </summary>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li><code>tracking_number</code> — {lang === "sv" ? "Spårningsnummer (eller ange order_reference)" : "Tracking number (or supply order_reference)"}</li>
              <li><code>carrier</code> — bring | postnord | ingested</li>
              <li><code>store_name</code> — {lang === "sv" ? "Visas i appen" : "Shown in the app"}</li>
              <li><code>order_reference</code> — {lang === "sv" ? "Din ordernummer" : "Your order number"}</li>
              <li><code>sender</code>, <code>nickname</code>, <code>status</code></li>
            </ul>
          </details>
        </section>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-background rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold">{lang === "sv" ? "Ny API-nyckel" : "New API key"}</h3>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === "sv" ? "T.ex. Min Shopify-butik" : "e.g. My Shopify store"}
              className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {create.error && <div className="text-sm text-destructive">{(create.error as Error).message}</div>}
            <div className="flex gap-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-3 rounded-2xl bg-secondary font-medium">
                {lang === "sv" ? "Avbryt" : "Cancel"}
              </button>
              <button
                disabled={!name.trim() || create.isPending}
                onClick={() => create.mutate()}
                className="flex-1 py-3 rounded-2xl text-primary-foreground font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "var(--gradient-primary)" }}
              >
                {create.isPending && <Loader2 className="size-4 animate-spin" />}
                {lang === "sv" ? "Skapa" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
