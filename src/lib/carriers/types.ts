export type CarrierId = "bring" | "postnord";

export type NormalizedStatus =
  | "unknown"
  | "in_transit"
  | "out_for_delivery"
  | "ready"
  | "delivered";

export interface TrackingEvent {
  at: string; // ISO
  description: string;
  location?: string;
}

export interface NormalizedTracking {
  status: NormalizedStatus;
  sender?: string;
  lockerLocation?: string;
  lockerAddress?: string;
  lockerNumber?: string;
  pickupCode?: string;
  lastEventAt?: string;
  lastEventDescription?: string;
  events: TrackingEvent[];
}

export interface CarrierFetchResult {
  ok: boolean;
  notFound?: boolean;
  error?: string;
  data?: NormalizedTracking;
}
