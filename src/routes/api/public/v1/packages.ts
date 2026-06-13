import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const payloadSchema = z.object({
  tracking_number: z.string().trim().min(1).max(64).optional(),
  carrier: z.enum(["bring", "postnord", "ingested"]).optional(),
  store_name: z.string().trim().max(80).optional(),
  order_reference: z.string().trim().max(80).optional(),
  sender: z.string().trim().max(120).optional(),
  nickname: z.string().trim().max(80).optional(),
  status: z.enum(["unknown", "in_transit", "out_for_delivery", "ready", "delivered"]).optional(),
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

export const Route = createFileRoute("/api/public/v1/packages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token.startsWith("pk_")) {
          return Response.json({ error: "Missing or invalid API key" }, { status: 401, headers: corsHeaders() });
        }
        const hash = await sha256Hex(token);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: key } = await supabaseAdmin
          .from("api_keys")
          .select("id, user_id")
          .eq("key_hash", hash)
          .maybeSingle();
        if (!key) {
          return Response.json({ error: "Invalid API key" }, { status: 401, headers: corsHeaders() });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders() });
        }
        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.issues },
            { status: 400, headers: corsHeaders() },
          );
        }
        const p = parsed.data;
        if (!p.tracking_number && !p.order_reference) {
          return Response.json(
            { error: "Either tracking_number or order_reference is required" },
            { status: 400, headers: corsHeaders() },
          );
        }
        const carrier = p.carrier ?? (p.tracking_number ? "ingested" : "ingested");
        const trackingNumber = p.tracking_number ?? `ORDER-${p.order_reference}`;

        const { data: inserted, error } = await supabaseAdmin
          .from("tracked_packages")
          .insert({
            user_id: key.user_id,
            carrier,
            tracking_number: trackingNumber,
            nickname: p.nickname || p.store_name || null,
            sender: p.sender || p.store_name || null,
            store_name: p.store_name || null,
            order_reference: p.order_reference || null,
            status: p.status || "in_transit",
            source: "api",
            source_api_key_id: key.id,
          })
          .select("id, tracking_number, status, created_at")
          .single();

        if (error) {
          if (error.code === "23505") {
            return Response.json({ error: "Package already exists" }, { status: 409, headers: corsHeaders() });
          }
          return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
        }

        await supabaseAdmin
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", key.id);

        return Response.json({ ok: true, package: inserted }, { status: 201, headers: corsHeaders() });
      },
    },
  },
});
