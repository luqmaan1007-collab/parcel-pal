import webpush from "web-push";

let configured = false;
export function getWebPush() {
  if (!configured) {
    const pub = process.env.VITE_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:notifications@example.com";
    if (!pub || !priv) throw new Error("VAPID keys not configured");
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
  return webpush;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  const wp = getWebPush();
  return wp.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
  );
}
