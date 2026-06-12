import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchBring } from "@/lib/carriers/bring.server";
import { fetchPostnord } from "@/lib/carriers/postnord.server";
import { sendPush } from "@/lib/push.server";

export async function fetchAndStore(packageId: string) {
  const { data: pkg } = await supabaseAdmin
    .from("tracked_packages")
    .select("*")
    .eq("id", packageId)
    .maybeSingle();
  if (!pkg) return null;

  const result =
    pkg.carrier === "bring"
      ? await fetchBring(pkg.tracking_number)
      : await fetchPostnord(pkg.tracking_number);

  const update: Record<string, any> = {
    last_refreshed_at: new Date().toISOString(),
  };
  if (result.ok && result.data) {
    const t = result.data;
    update.status = t.status;
    update.sender = pkg.sender || t.sender || null;
    update.locker_location = t.lockerLocation || pkg.locker_location;
    update.locker_address = t.lockerAddress || pkg.locker_address;
    update.locker_number = t.lockerNumber || pkg.locker_number;
    update.last_event_at = t.lastEventAt || pkg.last_event_at;
    update.last_event_description = t.lastEventDescription || pkg.last_event_description;
    update.events = t.events;
  } else if (result.error) {
    update.last_event_description = result.error;
  }

  const { data: updated } = await supabaseAdmin
    .from("tracked_packages")
    .update(update as any)
    .eq("id", packageId)
    .select("*")
    .single();

  // Notify on ready transition
  if (updated && updated.status === "ready" && !pkg.notified_ready) {
    await sendReadyNotifications(updated);
    await supabaseAdmin
      .from("tracked_packages")
      .update({ notified_ready: true })
      .eq("id", packageId);
  }
  return updated;
}

async function sendReadyNotifications(pkg: any) {
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", pkg.user_id);
  if (!subs?.length) return;
  const title = "Package ready for pickup";
  const body = `${pkg.sender || pkg.nickname || pkg.tracking_number} is waiting${pkg.locker_location ? ` at ${pkg.locker_location}` : ""}.`;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await sendPush(s, { title, body, url: `/package/${pkg.id}`, tag: pkg.id });
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );
}

export async function refreshAllActive(limit = 50) {
  const { data: pkgs } = await supabaseAdmin
    .from("tracked_packages")
    .select("id")
    .neq("status", "delivered")
    .order("last_refreshed_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (!pkgs?.length) return { processed: 0 };
  let processed = 0;
  for (const p of pkgs) {
    try {
      await fetchAndStore(p.id);
      processed++;
    } catch (err) {
      console.error("refresh failed", p.id, err);
    }
  }
  return { processed };
}
