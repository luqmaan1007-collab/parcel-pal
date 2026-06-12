import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/lang-context";
import { Package as PackageIcon, MapPin, Clock, ChevronRight, Bell } from "lucide-react";
import { mockPackages, type Package, type PackageStatus } from "@/lib/packages";
import type { TKey } from "@/lib/i18n";

const statusKey: Record<PackageStatus, TKey> = {
  in_transit: "inTransit",
  out_for_delivery: "outForDelivery",
  ready: "ready",
  delivered: "delivered",
};

const statusColor: Record<PackageStatus, string> = {
  in_transit: "bg-muted text-muted-foreground",
  out_for_delivery: "bg-warning/15 text-warning-foreground border border-warning/30",
  ready: "bg-success/15 text-success border border-success/30",
  delivered: "bg-muted text-muted-foreground",
};

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex rounded-full bg-white/15 backdrop-blur p-1 text-xs font-medium">
      <button
        onClick={() => setLang("sv")}
        className={`px-3 py-1 rounded-full transition-all ${lang === "sv" ? "bg-white text-primary" : "text-white/80"}`}
      >
        SV
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1 rounded-full transition-all ${lang === "en" ? "bg-white text-primary" : "text-white/80"}`}
      >
        EN
      </button>
    </div>
  );
}

export function PackageCard({ pkg }: { pkg: Package }) {
  const { t } = useLang();
  return (
    <Link
      to="/package/$id"
      params={{ id: pkg.id }}
      className="block rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
            <PackageIcon className="size-6 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{pkg.sender}</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{pkg.trackingNumber}</div>
          </div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground shrink-0 mt-2" />
      </div>

      <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColor[pkg.status]}`}>
        {pkg.status === "ready" && <span className="size-1.5 rounded-full bg-success animate-pulse" />}
        {t(statusKey[pkg.status])}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{pkg.lockerLocation}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="size-3.5" />
          <span>{pkg.eta === "today" ? t("today") : t("tomorrow")}</span>
        </div>
      </div>
    </Link>
  );
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-background py-6 px-4 md:py-10">
      <div className="mx-auto w-full max-w-md bg-background rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-border md:ring-8 md:ring-foreground/5 min-h-[700px] flex flex-col">
        {children}
      </div>
    </div>
  );
}

export { mockPackages };
export { Bell };
