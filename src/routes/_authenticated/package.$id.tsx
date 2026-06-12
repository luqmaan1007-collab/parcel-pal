import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/lang-context";
import { PhoneFrame, statusKey } from "@/components/package-ui";
import {
  ArrowLeft, MapPin, Package as PackageIcon, Check, Lock, LockOpen, Loader2, RefreshCw, Trash2,
} from "lucide-react";
import { getPackage, markPickedUp, refreshOne, removePackage } from "@/lib/packages.functions";

export const Route = createFileRoute("/_authenticated/package/$id")({
  ssr: false,
  component: PackageDetail,
});

type DoorState = "closed" | "opening" | "open" | "done";

function PackageDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [door, setDoor] = useState<DoorState>("closed");

  const { data: pkg, isLoading, error } = useQuery({
    queryKey: ["package", id],
    queryFn: () => getPackage({ data: { id } }),
  });

  const refresh = useMutation({
    mutationFn: () => refreshOne({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["package", id] });
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
  });

  const pickup = useMutation({
    mutationFn: () => markPickedUp({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["package", id] });
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
  });

  const remove = useMutation({
    mutationFn: () => removePackage({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
      navigate({ to: "/" });
    },
  });

  useEffect(() => {
    if (door === "opening") {
      const tm = setTimeout(() => setDoor("open"), 1400);
      return () => clearTimeout(tm);
    }
  }, [door]);

  if (isLoading) {
    return (
      <PhoneFrame>
        <div className="flex-1 grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      </PhoneFrame>
    );
  }
  if (error || !pkg) {
    return (
      <PhoneFrame>
        <div className="flex-1 grid place-items-center p-8 text-center">
          <div>
            <p className="text-muted-foreground">{(error as Error)?.message || "Not found"}</p>
            <Link to="/" className="text-primary mt-4 inline-block">Back</Link>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const canOpen = pkg.status === "ready";
  const events: Array<{ at: string; description: string; location?: string }> = Array.isArray(pkg.events) ? (pkg.events as any) : [];
  const carrierLabel = pkg.carrier === "bring" ? "Bring" : "PostNord";

  return (
    <PhoneFrame>
      <div className="px-6 pt-8 pb-6 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate({ to: "/" })} className="size-10 rounded-full bg-white/15 backdrop-blur grid place-items-center">
            <ArrowLeft className="size-5" />
          </button>
          <div className="text-xs font-mono opacity-80">{carrierLabel} · {pkg.tracking_number}</div>
          <button
            onClick={() => refresh.mutate()}
            className="size-10 rounded-full bg-white/15 backdrop-blur grid place-items-center"
            aria-label={t("refresh")}
          >
            <RefreshCw className={`size-4 ${refresh.isPending ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
            <PackageIcon className="size-7" />
          </div>
          <div className="min-w-0">
            <div className="text-xs opacity-80">{pkg.nickname ? t("from") : carrierLabel}</div>
            <div className="text-xl font-bold truncate">{pkg.nickname || pkg.sender || carrierLabel}</div>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/15 backdrop-blur">
          {pkg.status === "ready" && <span className="size-1.5 rounded-full bg-success animate-pulse" />}
          {t(statusKey[pkg.status as keyof typeof statusKey])}
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">
        {pkg.locker_location && (
          <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <MapPin className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">{t("pickupLocation")}</div>
                <div className="font-semibold">{pkg.locker_location}</div>
                {pkg.locker_address && <div className="text-xs text-muted-foreground mt-0.5">{pkg.locker_address}</div>}
              </div>
              {pkg.locker_number && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{t("locker")}</div>
                  <div className="font-bold">{pkg.locker_number}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {canOpen && pkg.pickup_code && (
          <div className="rounded-3xl p-6 text-primary-foreground shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest opacity-80">{t("yourCode")}</div>
              <div className="text-5xl font-bold font-mono tracking-[0.3em] mt-2">{pkg.pickup_code}</div>
            </div>

            <div className="mt-6 mx-auto w-44 h-44 [perspective:800px]">
              <div className="relative w-full h-full rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden">
                <div className="absolute inset-2 rounded-xl bg-black/30 grid place-items-center">
                  {door === "open" || door === "done" ? (
                    <div className="size-16 rounded-xl bg-warning grid place-items-center animate-[check-pop_0.4s_ease-out]">
                      <PackageIcon className="size-8 text-warning-foreground" />
                    </div>
                  ) : (
                    <Lock className="size-8 text-white/30" />
                  )}
                </div>
                <div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-white/10 backdrop-blur border-2 border-white/30 origin-left transition-transform duration-[1400ms] ease-in-out [transform-style:preserve-3d]"
                  style={{ transform: door === "closed" ? "rotateY(0)" : "rotateY(-110deg)" }}
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 size-2 rounded-full bg-white/60" />
                  {pkg.locker_number && <div className="absolute top-3 left-3 text-xs font-mono opacity-80">{pkg.locker_number}</div>}
                </div>
              </div>
            </div>

            <button
              disabled={door !== "closed" && door !== "done"}
              onClick={() => {
                if (door === "closed") setDoor("opening");
                else if (door === "open") {
                  setDoor("done");
                  pickup.mutate();
                }
              }}
              className="mt-6 w-full py-4 rounded-2xl bg-white text-primary font-bold text-lg shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {door === "closed" && (<><LockOpen className="size-5" /> {t("openLocker")}</>)}
              {door === "opening" && (<><Loader2 className="size-5 animate-spin" /> {t("opening")}</>)}
              {door === "open" && (<><Check className="size-5" /> {t("markPickedUp")}</>)}
              {door === "done" && (<><Check className="size-5" /> {t("pickedUp")}</>)}
            </button>

            {door === "open" && (
              <div className="mt-3 text-center text-xs opacity-90 animate-[slide-up_0.3s_ease-out]">
                {t("takePackage")}
              </div>
            )}
          </div>
        )}

        {canOpen && !pkg.pickup_code && (
          <div className="rounded-3xl bg-warning/10 border border-warning/30 p-4 text-sm">
            <div className="font-semibold text-warning-foreground">{lang === "sv" ? "Lägg till din hämtkod" : "Add your pickup code"}</div>
            <p className="text-muted-foreground text-xs mt-1">{t("pickupCodeHint")}</p>
          </div>
        )}

        <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">{t("timeline")}</div>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("notTracked")}</p>
          ) : (
            <ol className="space-y-3">
              {events.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`size-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    {i < events.length - 1 && <div className="flex-1 w-px bg-border my-1" />}
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="text-sm">{e.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {e.at ? new Date(e.at).toLocaleString(lang) : ""}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <button
          onClick={() => {
            if (confirm(t("confirmDelete"))) remove.mutate();
          }}
          className="w-full py-3 rounded-2xl bg-destructive/10 text-destructive font-medium flex items-center justify-center gap-2"
        >
          <Trash2 className="size-4" /> {t("delete")}
        </button>
      </div>
    </PhoneFrame>
  );
}
