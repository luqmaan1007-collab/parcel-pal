import type { CarrierFetchResult, NormalizedStatus, TrackingEvent } from "./types";

const POSTNORD_URL =
  "https://api2.postnord.com/rest/shipment/v5/trackandtrace/findByIdentifier.json";

function mapPostnordStatus(status?: string): NormalizedStatus {
  const s = (status || "").toUpperCase();
  if (s === "DELIVERED") return "delivered";
  if (s === "AVAILABLE_FOR_DELIVERY" || s === "AVAILABLE_FOR_PICKUP") return "ready";
  if (s === "EN_ROUTE" || s === "OUT_FOR_DELIVERY") return "out_for_delivery";
  if (s === "INFORMED" || s === "CREATED" || s === "OTHER" || s === "DELIVERY_IMPOSSIBLE")
    return "in_transit";
  return "unknown";
}

export async function fetchPostnord(trackingNumber: string): Promise<CarrierFetchResult> {
  const apiKey = process.env.POSTNORD_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "PostNord tracking is not configured yet. Add a POSTNORD_API_KEY from developer.postnord.com.",
    };
  }
  try {
    const url = `${POSTNORD_URL}?id=${encodeURIComponent(trackingNumber)}&locale=en&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "PostNord rejected the API key." };
    if (!res.ok) return { ok: false, error: `PostNord HTTP ${res.status}` };
    const body = (await res.json()) as any;
    const shipments = body?.TrackingInformationResponse?.shipments ?? [];
    if (!shipments.length) return { ok: false, notFound: true };
    const shipment = shipments[0];
    const item = shipment.items?.[0] ?? {};
    const rawEvents: any[] = item.events ?? [];
    const events: TrackingEvent[] = rawEvents
      .slice()
      .reverse()
      .map((e) => ({
        at: e.eventTime,
        description: e.eventDescription || e.status,
        location: e.location?.displayName,
      }));
    const latest = events[events.length - 1];
    const status = mapPostnordStatus(item.statusCode || shipment.status);
    const dropOff = shipment.consignor?.name as string | undefined;
    const pickupPoint = item.pickupPoint;
    return {
      ok: true,
      data: {
        status,
        sender: dropOff,
        lockerLocation: pickupPoint?.name,
        lockerAddress: pickupPoint?.address
          ? `${pickupPoint.address.street1 ?? ""}, ${pickupPoint.address.postalCode ?? ""} ${pickupPoint.address.city ?? ""}`.trim()
          : undefined,
        lockerNumber: pickupPoint?.servicePointId,
        lastEventAt: latest?.at,
        lastEventDescription: latest?.description,
        events,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
