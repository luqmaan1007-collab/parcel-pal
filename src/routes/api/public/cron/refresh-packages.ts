import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/refresh-packages")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: require the project anon key in apikey header (pg_cron pattern)
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { refreshAllActive } = await import("@/lib/refresh.server");
        const result = await refreshAllActive(100);
        return Response.json(result);
      },
    },
  },
});
