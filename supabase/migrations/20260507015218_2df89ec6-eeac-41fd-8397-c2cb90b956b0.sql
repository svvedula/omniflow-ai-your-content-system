
-- Personal API keys for browser extension
CREATE TABLE public.extension_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  label TEXT DEFAULT 'Browser Extension',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE public.extension_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.extension_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.extension_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.extension_keys FOR DELETE USING (auth.uid() = user_id);

-- Daily access unlocks (10 credits per day, or free for Pro users)
CREATE TABLE public.extension_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  unlocked_for DATE NOT NULL,
  credits_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'credits', -- 'credits' or 'pro'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, unlocked_for)
);

ALTER TABLE public.extension_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.extension_access FOR SELECT USING (auth.uid() = user_id);

-- Spend 10 credits to unlock today (or free for Pro)
CREATE OR REPLACE FUNCTION public.unlock_extension_day()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
  v_pro_until TIMESTAMPTZ;
  v_balance NUMERIC(10,2);
  v_existing UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id INTO v_existing FROM public.extension_access
   WHERE user_id = v_user_id AND unlocked_for = v_today;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'already_unlocked', true);
  END IF;

  SELECT pro_until INTO v_pro_until FROM public.profiles WHERE user_id = v_user_id;
  IF v_pro_until IS NOT NULL AND v_pro_until > now() THEN
    INSERT INTO public.extension_access (user_id, unlocked_for, credits_spent, source)
      VALUES (v_user_id, v_today, 0, 'pro');
    RETURN jsonb_build_object('success', true, 'source', 'pro');
  END IF;

  SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = v_user_id;
  IF v_balance IS NULL OR v_balance < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need 10 credits to unlock today', 'balance', COALESCE(v_balance, 0));
  END IF;

  UPDATE public.user_credits
     SET balance = balance - 10, updated_at = now()
   WHERE user_id = v_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (v_user_id, -10, 'extension_unlock', 'Browser extension daily access');

  INSERT INTO public.extension_access (user_id, unlocked_for, credits_spent, source)
    VALUES (v_user_id, v_today, 10, 'credits');

  RETURN jsonb_build_object('success', true, 'source', 'credits', 'new_balance', v_balance - 10);
END;
$$;

-- Validate API key + access (called by extension edge function with service role)
CREATE OR REPLACE FUNCTION public.check_extension_access(p_api_key TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
  v_has_access BOOLEAN;
  v_pro_until TIMESTAMPTZ;
BEGIN
  SELECT user_id INTO v_user_id FROM public.extension_keys WHERE api_key = p_api_key;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid key');
  END IF;

  UPDATE public.extension_keys SET last_used_at = now() WHERE api_key = p_api_key;

  SELECT pro_until INTO v_pro_until FROM public.profiles WHERE user_id = v_user_id;
  IF v_pro_until IS NOT NULL AND v_pro_until > now() THEN
    -- Auto-record pro access
    INSERT INTO public.extension_access (user_id, unlocked_for, credits_spent, source)
      VALUES (v_user_id, v_today, 0, 'pro')
      ON CONFLICT (user_id, unlocked_for) DO NOTHING;
    RETURN jsonb_build_object('valid', true, 'user_id', v_user_id, 'source', 'pro');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.extension_access
     WHERE user_id = v_user_id AND unlocked_for = v_today
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Daily access not unlocked', 'user_id', v_user_id);
  END IF;

  RETURN jsonb_build_object('valid', true, 'user_id', v_user_id, 'source', 'credits');
END;
$$;
