import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const carrierEnum = z.enum(["bring", "postnord"]);

export const listPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tracked_packages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPackage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tracked_packages")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const addPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        carrier: carrierEnum,
        trackingNumber: z.string().trim().min(4).max(64),
        nickname: z.string().trim().max(80).optional(),
        pickupCode: z.string().trim().max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { fetchAndStore } = await import("@/lib/refresh.server");
    const { data: inserted, error } = await context.supabase
      .from("tracked_packages")
      .insert({
        user_id: context.userId,
        carrier: data.carrier,
        tracking_number: data.trackingNumber.trim(),
        nickname: data.nickname || null,
        pickup_code: data.pickupCode || null,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("You already track this package.");
      throw new Error(error.message);
    }
    // Fetch real status right away
    try {
      const refreshed = await fetchAndStore(inserted.id);
      return refreshed ?? inserted;
    } catch {
      return inserted;
    }
  });

export const removePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tracked_packages")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markPickedUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tracked_packages")
      .update({ status: "delivered", picked_up_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const refreshOne = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Verify ownership through RLS
    const { data: row, error } = await context.supabase
      .from("tracked_packages")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    const { fetchAndStore } = await import("@/lib/refresh.server");
    return (await fetchAndStore(data.id)) ?? null;
  });
