
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Own profile upsert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Carrier + status enums
CREATE TYPE public.carrier AS ENUM ('bring', 'postnord');
CREATE TYPE public.pkg_status AS ENUM ('unknown','in_transit','out_for_delivery','ready','delivered');

-- Tracked packages
CREATE TABLE public.tracked_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carrier public.carrier NOT NULL,
  tracking_number TEXT NOT NULL,
  nickname TEXT,
  status public.pkg_status NOT NULL DEFAULT 'unknown',
  sender TEXT,
  locker_location TEXT,
  locker_address TEXT,
  locker_number TEXT,
  pickup_code TEXT,
  last_event_at TIMESTAMPTZ,
  last_event_description TEXT,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  notified_ready BOOLEAN NOT NULL DEFAULT false,
  picked_up_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, carrier, tracking_number)
);
CREATE INDEX tracked_packages_user_idx ON public.tracked_packages(user_id);
CREATE INDEX tracked_packages_refresh_idx ON public.tracked_packages(status, last_refreshed_at) WHERE status <> 'delivered';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_packages TO authenticated;
GRANT ALL ON public.tracked_packages TO service_role;
ALTER TABLE public.tracked_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own packages" ON public.tracked_packages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subs" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tracked_packages_updated BEFORE UPDATE ON public.tracked_packages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
