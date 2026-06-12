import type { CarrierFetchResult, NormalizedStatus, TrackingEvent } from "./types";

const BRING_URL = "https://tracking.bring.com/api/v2/tracking.json";

function mapBringStatus(statusCode?: string, eventDesc?: string): NormalizedStatus {
  const s = (statusCode || "").toUpperCase();
  const d = (eventDesc || "").toLowerCase();
  if (s === "DELIVERED" || d.includes("utlevert") || d.includes("delivered") || d.includes("hämtad") || d.includes("picked up"))
    return "delivered";
  if (s === "READY_FOR_PICKUP" || d.includes("klar för henting") || d.includes("ready for pickup") || d.includes("hämtas") || d.includes("kan hämtas"))
    return "ready";
  if (d.includes("out for delivery") || d.includes("ut til levering") || d.includes("ute för leverans"))
    return "out_for_delivery";
  if (s === "IN_TRANSIT" || s === "HANDED_IN" || d) return "in_transit";
  return "unknown";
}

export async function fetchBring(trackingNumber: string): Promise<CarrierFetchResult> {
  const uid = process.env.BRING_API_UID || "lovable-app@example.com";
  try {
    const res = await fetch(`${BRING_URL}?q=${encodeURIComponent(trackingNumber)}`, {
      headers: { "X-Mybring-API-Uid": uid, Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, error: `Bring HTTP ${res.status}` };
    const body = (await res.json()) as any;
    const consignmentSet = body?.consignmentSet ?? [];
    if (!consignmentSet.length) return { ok: false, notFound: true };
    const consignment = consignmentSet[0];
    const pkg = consignment?.packageSet?.[0];
    if (!pkg) return { ok: false, notFound: true };

    const evRaw: any[] = pkg.eventSet ?? [];
    const events: TrackingEvent[] = evRaw.map((e) => ({
      at: e.dateIso || e.displayDate || new Date().toISOString(),
      description: e.description || e.status || "",
      location: [e.city, e.country, e.postalCode].filter(Boolean).join(", ") || undefined,
    }));
    const latest = events[0];
    const statusCode: string | undefined = pkg.statusDescription || pkg.status;
    const status = mapBringStatus(pkg.status, latest?.description);

    // Pickup point detection — Bring exposes "pickupPoint" on some packages
    const pickup = pkg.pickupPoint || pkg.pickupNotice || null;
    return {
      ok: true,
      data: {
        status,
        sender: consignment?.senderName || pkg?.senderName,
        lockerLocation: pickup?.name,
        lockerAddress: pickup?.address ? `${pickup.address}, ${pickup.postalCode ?? ""} ${pickup.city ?? ""}`.trim() : undefined,
        lockerNumber: pickup?.locationId || pickup?.id,
        lastEventAt: latest?.at,
        lastEventDescription: latest?.description || statusCode,
        events,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
