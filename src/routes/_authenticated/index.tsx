import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/lang-context";
import { PackageCard, PhoneFrame, LangSwitch, Bell, type PackageRow } from "@/components/package-ui";
import { Plus, Home, User, Loader2, BellRing, LogOut, X, RefreshCw } from "lucide-react";
import { addPackage, listPackages } from "@/lib/packages.functions";
import { supabase } from "@/integrations/supabase/client";
import { enablePush, disablePush, getPushPermissionState, isPushSupported } from "@/lib/push-client";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "My packages — Paketly" }] }),
  component: Index,
});

function Index() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const { data: packages = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["packages"],
    queryFn: () => listPackages(),
  });

  const active = packages.filter((p) => p.status !== "delivered");
  const ready = active.find((p) => p.status === "ready");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <PhoneFrame>
      <div className="relative px-6 pt-8 pb-20 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">{t("appName")}</div>
            <h1 className="text-2xl font-bold mt-1">{t("myPackages")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button onClick={() => refetch()} className="size-10 rounded-full bg-white/15 backdrop-blur grid place-items-center" aria-label={t("refresh")}>
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {ready && (
          <Link
            to="/package/$id"
            params={{ id: ready.id }}
            className="absolute left-6 right-6 -bottom-12 rounded-3xl bg-card text-card-foreground p-4 shadow-[var(--shadow-soft)] flex items-center gap-3 animate-[slide-up_0.4s_ease-out]"
          >
            <div className="relative">
              <span className="absolute inset-0 rounded-2xl bg-success/40 animate-[pulse-ring_2s_ease-out_infinite]" />
              <div className="relative size-12 rounded-2xl grid place-items-center" style={{ background: "var(--gradient-success)" }}>
                <Bell className="size-5 text-success-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{t("packageArrived")}</div>
              <div className="text-xs text-muted-foreground truncate">{ready.locker_location || ready.tracking_number}</div>
            </div>
          </Link>
        )}
      </div>

      <div className="flex-1 px-6 pt-16 pb-24 space-y-3 overflow-y-auto">
        <PushPrompt />
        <div className="flex items-center justify-between mb-2 mt-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("activeDeliveries")}
          </h2>
          <button onClick={() => setShowAdd(true)} className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center">
            <Plus className="size-4" />
          </button>
        </div>

        {isLoading && (
          <div className="grid place-items-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}

        {!isLoading && active.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">{t("noPackages")}</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-5 py-2.5 rounded-full text-primary-foreground font-medium text-sm"
              style={{ background: "var(--gradient-primary)" }}
            >
              {t("addFirst")}
            </button>
          </div>
        )}

        {active.map((p) => (
          <PackageCard key={p.id} pkg={p as PackageRow} />
        ))}

        {packages.filter((p) => p.status === "delivered").length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
              {t("delivered")}
            </h2>
            {packages.filter((p) => p.status === "delivered").map((p) => (
              <PackageCard key={p.id} pkg={p as PackageRow} />
            ))}
          </>
        )}
      </div>

      <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-around">
        <NavItem icon={<Home className="size-5" />} label={t("home")} active />
        <NavItem icon={<BellRing className="size-5" />} label={t("notifications")} />
        <button onClick={signOut} className="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground">
          <LogOut className="size-5" />
          <span className="text-[10px] font-medium">{lang === "sv" ? "Logga ut" : "Sign out"}</span>
        </button>
      </div>

      {showAdd && <AddSheet onClose={() => setShowAdd(false)} />}
    </PhoneFrame>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

function PushPrompt() {
  const { t } = useLang();
  const [state, setState] = useState<NotificationPermission | "unsupported" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPushPermissionState().then(setState);
  }, []);

  if (state === null) return null;
  if (state === "unsupported")
    return (
      <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
        {t("notSupported")}
      </div>
    );
  if (state === "granted")
    return (
      <div className="rounded-2xl bg-success/10 border border-success/20 text-success px-4 py-3 text-xs flex items-center gap-2">
        <BellRing className="size-4" /> {t("notificationsOn")}
      </div>
    );
  if (state === "denied") return null;

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await enablePush();
          setState("granted");
        } catch (e) {
          console.error(e);
          setState(Notification.permission);
        } finally {
          setLoading(false);
        }
      }}
      className="w-full rounded-2xl px-4 py-3 text-left flex items-center gap-3 bg-card border border-border hover:border-primary/40 transition-colors disabled:opacity-60"
    >
      <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
        <BellRing className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{t("enableNotifications")}</div>
        <div className="text-xs text-muted-foreground">{t("notificationsHelp")}</div>
      </div>
    </button>
  );
}

function AddSheet({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [carrier, setCarrier] = useState<"bring" | "postnord">("bring");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [nickname, setNickname] = useState("");
  const [pickupCode, setPickupCode] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      addPackage({
        data: {
          carrier,
          trackingNumber: trackingNumber.trim(),
          nickname: nickname.trim() || undefined,
          pickupCode: pickupCode.trim() || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-[slide-up_0.3s_ease-out]"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("addPackage")}</h3>
          <button onClick={onClose} className="size-8 rounded-full bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("carrier")}</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setCarrier("bring")}
              className={`py-3 rounded-2xl border font-medium text-sm ${carrier === "bring" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
            >Bring / Posten</button>
            <button
              type="button"
              onClick={() => setCarrier("postnord")}
              className={`py-3 rounded-2xl border font-medium text-sm ${carrier === "postnord" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
            >PostNord</button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("trackingNumber")}</label>
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. TESTPACKAGE-AT-PICKUPPOINT"
            className="w-full mt-1 px-4 py-3 rounded-2xl bg-secondary border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("nickname")}</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={lang === "sv" ? "T.ex. Skor från Zalando" : "e.g. Shoes from Zalando"}
            className="w-full mt-1 px-4 py-3 rounded-2xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("pickupCodeOptional")}</label>
          <input
            value={pickupCode}
            onChange={(e) => setPickupCode(e.target.value)}
            inputMode="numeric"
            className="w-full mt-1 px-4 py-3 rounded-2xl bg-secondary border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground mt-1">{t("pickupCodeHint")}</p>
        </div>

        {mutation.error && (
          <div className="text-sm text-destructive">{(mutation.error as Error).message}</div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-secondary font-medium">{t("cancel")}</button>
          <button
            disabled={!trackingNumber.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 py-3 rounded-2xl text-primary-foreground font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
