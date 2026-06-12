import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/lib/lang-context";
import { mockPackages } from "@/lib/packages";
import { PackageCard, PhoneFrame, LangSwitch } from "@/components/package-ui";
import { Bell, Plus, Home, MapPin, User } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paketly — Smart parcel delivery" },
      { name: "description", content: "Track packages and open parcel lockers from your phone." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useLang();
  const active = mockPackages.filter((p) => p.status !== "delivered");
  const ready = active.find((p) => p.status === "ready");

  return (
    <PhoneFrame>
      {/* Header */}
      <div className="relative px-6 pt-8 pb-20 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">{t("appName")}</div>
            <h1 className="text-2xl font-bold mt-1">{t("myPackages")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button className="size-10 rounded-full bg-white/15 backdrop-blur grid place-items-center relative">
              <Bell className="size-5" />
              {ready && <span className="absolute top-2 right-2 size-2 rounded-full bg-warning" />}
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
              <div className="text-xs text-muted-foreground truncate">{t("tapToOpen")}</div>
            </div>
          </Link>
        )}
      </div>

      {/* List */}
      <div className="flex-1 px-6 pt-16 pb-24 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("activeDeliveries")}
          </h2>
          <button className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center">
            <Plus className="size-4" />
          </button>
        </div>
        {active.map((p) => (
          <PackageCard key={p.id} pkg={p} />
        ))}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-around">
        <NavItem icon={<Home className="size-5" />} label={t("home")} active />
        <NavItem icon={<MapPin className="size-5" />} label={t("map")} />
        <NavItem icon={<User className="size-5" />} label={t("profile")} />
      </div>
    </PhoneFrame>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-col items-center gap-1 px-3 py-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
