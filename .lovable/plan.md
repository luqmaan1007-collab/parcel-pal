## Goal

Turn Paketly from a mock demo into a real app: users sign in, add real tracking numbers from Bring (and PostNord), the backend polls the carriers, and a Web Push notification fires when a package becomes ready for pickup.

## External services & what they need from you

Two of the three integrations need credentials you must obtain — I can't get them for you.

1. **Bring Tracking API** — Free, no key. Just an identifying email in `X-Mybring-API-Uid` header. I'll set this to a placeholder you can change.
2. **PostNord Tracking API** — Requires a free API key from `developer.postnord.com`. You apply, they email a key. **You'll need to give me this key as a secret.** Without it, PostNord tracking won't work and only Bring will.
3. **Web Push (VAPID)** — I generate the keypair myself, store the private key as a secret, ship the public key to the browser. No third party needed.

If you don't have a PostNord key yet, I'll build the Bring path end-to-end and stub PostNord behind a "coming soon" message until you add the key.

## What gets built

### Backend (Lovable Cloud / Supabase)
- `profiles` — basic user profile, auto-created on signup.
- `tracked_packages` — `user_id`, `carrier` (`bring`|`postnord`), `tracking_number`, `nickname`, `last_status`, `last_event_at`, `locker_address`, `pickup_code` (user-entered, carriers don't expose this), `notified_ready` (so we don't spam).
- `push_subscriptions` — `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent`.
- RLS scoped to `auth.uid()` on both.
- `pg_cron` job hitting a public server route every 10 min to refresh statuses + send pushes for newly-ready packages.

### Server functions / routes
- `addPackage`, `removePackage`, `listPackages`, `markPickedUp` (auth-gated `createServerFn`s).
- `refreshPackage` — fetches Bring/PostNord, normalizes status into `in_transit | out_for_delivery | ready | delivered`.
- `subscribePush` / `unsubscribePush`.
- `POST /api/public/cron/refresh-packages` — secret-header-guarded, iterates packages, calls `refreshPackage`, sends Web Push via `web-push` on `ready` transition.

### Frontend
- `/auth` — email/password + Google (Lovable broker).
- `_authenticated/` layout gates everything below.
- `/` — list of the user's real packages, "Add package" sheet (carrier picker + tracking number + optional nickname), pull-to-refresh, "Enable notifications" prompt.
- `/package/$id` — real timeline from carrier events; the "Öppna luckan" animation stays as a visual "mark as picked up" confirmation (carriers do not expose locker-opening APIs to third parties — this is a hard limitation, not something I can work around).
- PWA: manifest + icons + service worker that handles `push` and `notificationclick` events. Install-to-home-screen prompt; on iOS, push only works after install (iOS 16.4+).
- Bilingual SV/EN preserved.

### Removed
- `src/lib/packages.ts` mock data and all references to `mockPackages`.

## Technical details

- `web-push` npm package for sending; VAPID keys generated once via `npx web-push generate-vapid-keys` and stored as `VAPID_PUBLIC_KEY` (also exposed as `VITE_VAPID_PUBLIC_KEY`) and `VAPID_PRIVATE_KEY`.
- Bring endpoint: `https://tracking.bring.com/api/v2/tracking.json?q=<number>`.
- PostNord endpoint: `https://api2.postnord.com/rest/shipment/v5/trackandtrace/findByIdentifier.json?id=<number>&locale=en&apikey=<key>`.
- Status normalization lives in `src/lib/carriers/` with one file per carrier + a shared `normalize` type.
- Cron route protected by a `CRON_SECRET` header check.
- Service worker is a hand-written `public/sw.js` scoped to push only (no offline caching, per the PWA skill's narrow-scope rule).

## What I need from you to start

1. Confirm I should **enable Lovable Cloud** (required for auth + DB + secrets).
2. Tell me whether you have a **PostNord API key** now, or want me to ship Bring-only and add PostNord later.
3. An **email address for the Bring API header** (any address — it's just an identifier, not auth).

Once you answer, I'll start building.
