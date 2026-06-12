import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { mockPackages, type PackageStatus } from "@/lib/packages";
import { PhoneFrame } from "@/components/package-ui";
import { ArrowLeft, MapPin, Package as PackageIcon, Navigation, Check, Lock, LockOpen } from "lucide-react";
import type { TKey } from "@/lib/i18n";

export const Route = createFileRoute("/package/$id")({
  loader: ({ params }) => {
    const pkg = mockPackages.find((p) => p.id === params.id);
    if (!pkg) throw notFound();
    return { pkg };
  },
  notFoundComponent: () => (
    <PhoneFrame>
      <div className="flex-1 grid place-items-center p-8 text-center">
        <div>
          <p className="text-muted-foreground">Package not found</p>
          <Link to="/" className="text-primary mt-4 inline-block">Back</Link>
        </div>
      </div>
    </PhoneFrame>
  ),
  errorComponent: () => (
    <PhoneFrame>
      <div className="flex-1 grid place-items-center p-8">
        <Link to="/" className="text-primary">Back</Link>
      </div>
    </PhoneFrame>
  ),
  component: PackageDetail,
});

const statusSteps: PackageStatus[] = ["in_transit", "out_for_delivery", "ready", "delivered"];
const statusKey: Record<PackageStatus, TKey> = {
  in_transit: "inTransit",
  out_for_delivery: "outForDelivery",
  ready: "ready",
  delivered: "delivered",
};

type DoorState = "closed" | "opening" | "open" | "done";

function PackageDetail() {
  const { pkg } = Route.useLoaderData();
  const { t } = useLang();
  const navigate = useNavigate();
  const [door, setDoor] = useState<DoorState>("closed");

  const currentStep = statusSteps.indexOf(pkg.status);
  const canOpen = pkg.status === "ready";

  useEffect(() => {
    if (door === "opening") {
      const tm = setTimeout(() => setDoor("open"), 1400);
      return () => clearTimeout(tm);
    }
  }, [door]);

  return (
    <PhoneFrame>
      <div className="px-6 pt-8 pb-6 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate({ to: "/" })} className="size-10 rounded-full bg-white/15 backdrop-blur grid place-items-center">
            <ArrowLeft className="size-5" />
          </button>
          <div className="text-xs font-mono opacity-80">{pkg.trackingNumber}</div>
          <div className="size-10" />
        </div>

        <div className="flex items-center gap-3">
          <div className="size-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
            <PackageIcon className="size-7" />
          </div>
          <div>
            <div className="text-xs opacity-80">{t("from")}</div>
            <div className="text-xl font-bold">{pkg.sender}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">
        {/* Status timeline */}
        <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex justify-between mb-3">
            {statusSteps.slice(0, 3).map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`size-8 rounded-full grid place-items-center text-xs font-bold transition-all ${
                    i <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < currentStep ? <Check className="size-4" /> : i + 1}
                </div>
                <div className={`text-[10px] text-center leading-tight ${i <= currentStep ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {t(statusKey[s])}
                </div>
              </div>
            ))}
          </div>
          <div className="relative h-1 bg-muted rounded-full mt-2">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{ width: `${(currentStep / 2) * 100}%`, background: "var(--gradient-primary)" }}
            />
          </div>
        </div>

        {/* Pickup location */}
        <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
              <MapPin className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">{t("pickupLocation")}</div>
              <div className="font-semibold">{pkg.lockerLocation}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{pkg.lockerAddress}</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground">{t("locker")}</div>
              <div className="font-bold text-lg">{pkg.lockerNumber}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("distance")}</div>
              <div className="font-bold text-lg">{pkg.distanceKm} km</div>
            </div>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Navigation className="size-4" />
              {t("directions")}
            </button>
          </div>
        </div>

        {/* Pickup code & action */}
        {canOpen && (
          <div className="rounded-3xl p-6 text-primary-foreground shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest opacity-80">{t("yourCode")}</div>
              <div className="text-5xl font-bold font-mono tracking-[0.3em] mt-2">{pkg.pickupCode}</div>
              <div className="text-xs opacity-80 mt-2">{t("holdNear")}</div>
            </div>

            {/* Locker visual */}
            <div className="mt-6 mx-auto w-44 h-44 [perspective:800px]">
              <div className="relative w-full h-full rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden">
                {/* Inside */}
                <div className="absolute inset-2 rounded-xl bg-black/30 grid place-items-center">
                  {door === "open" || door === "done" ? (
                    <div className="size-16 rounded-xl bg-warning grid place-items-center animate-[check-pop_0.4s_ease-out]">
                      <PackageIcon className="size-8 text-warning-foreground" />
                    </div>
                  ) : (
                    <Lock className="size-8 text-white/30" />
                  )}
                </div>
                {/* Door */}
                <div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-white/10 backdrop-blur border-2 border-white/30 origin-left transition-transform duration-[1400ms] ease-in-out [transform-style:preserve-3d]"
                  style={{
                    transform: door === "closed" ? "rotateY(0)" : "rotateY(-110deg)",
                  }}
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 size-2 rounded-full bg-white/60" />
                  <div className="absolute top-3 left-3 text-xs font-mono opacity-80">{pkg.lockerNumber}</div>
                </div>
              </div>
            </div>

            <button
              disabled={door !== "closed" && door !== "done"}
              onClick={() => {
                if (door === "closed") setDoor("opening");
                else if (door === "open") setDoor("done");
              }}
              className="mt-6 w-full py-4 rounded-2xl bg-white text-primary font-bold text-lg shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {door === "closed" && (<><LockOpen className="size-5" /> {t("openLocker")}</>)}
              {door === "opening" && (<><span className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /> {t("opening")}</>)}
              {door === "open" && (<><Check className="size-5" /> {t("done")}</>)}
              {door === "done" && (<><Check className="size-5" /> {t("opened")}</>)}
            </button>

            {door === "open" && (
              <div className="mt-3 text-center text-xs opacity-90 animate-[slide-up_0.3s_ease-out]">
                {t("takePackage")}
              </div>
            )}
          </div>
        )}

        {!canOpen && (
          <div className="rounded-3xl bg-muted p-5 text-center text-sm text-muted-foreground">
            {t("estimatedArrival")}: <span className="font-semibold text-foreground">{pkg.eta === "today" ? t("today") : t("tomorrow")}</span>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
