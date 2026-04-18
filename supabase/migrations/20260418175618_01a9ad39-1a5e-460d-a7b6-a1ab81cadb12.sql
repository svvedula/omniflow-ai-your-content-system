
-- ============ ROLES SYSTEM ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PRO SUBSCRIPTION ON PROFILES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ;

-- ============ REDEEM CODES ============
CREATE TABLE public.redeem_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  credits_reward NUMERIC(10,2) NOT NULL DEFAULT 0,
  pro_days_reward INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER, -- NULL = unlimited
  use_count INTEGER NOT NULL DEFAULT 0,
  is_one_time_global BOOLEAN NOT NULL DEFAULT false, -- true for paid gift codes
  source TEXT NOT NULL DEFAULT 'admin', -- 'admin' or 'gift'
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (credits_reward >= 0 AND pro_days_reward >= 0)
);

ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all codes" ON public.redeem_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone signed in can SELECT a code they're trying to validate (limited columns via app)
-- We rely on RPC for redemption, so no broad select policy needed for users.

-- ============ CODE REDEMPTIONS ============
CREATE TABLE public.code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_granted NUMERIC(10,2) NOT NULL DEFAULT 0,
  pro_days_granted INTEGER NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions" ON public.code_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all redemptions" ON public.code_redemptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ GIFT PURCHASES ============
CREATE TABLE public.gift_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT,
  recipient_name TEXT,
  message TEXT,
  pro_days INTEGER NOT NULL,
  amount_cents INTEGER, -- price paid, set when payments enabled
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | redeemed | refunded
  code_id UUID REFERENCES public.redeem_codes(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ
);

ALTER TABLE public.gift_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own gifts" ON public.gift_purchases
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

CREATE POLICY "Users insert own gifts" ON public.gift_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins manage all gifts" ON public.gift_purchases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ REDEEM RPC ============
CREATE OR REPLACE FUNCTION public.redeem_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code public.redeem_codes%ROWTYPE;
  v_existing UUID;
  v_new_balance NUMERIC;
  v_new_pro_until TIMESTAMPTZ;
  v_normalized TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_normalized := upper(trim(p_code));

  SELECT * INTO v_code FROM public.redeem_codes
   WHERE upper(code) = v_normalized
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid code');
  END IF;

  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code is no longer active');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has expired');
  END IF;

  -- One-time-global codes (paid gifts): allow exactly one redemption ever.
  IF v_code.is_one_time_global AND v_code.use_count >= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This gift code has already been redeemed');
  END IF;

  -- Per-user uniqueness (admin codes).
  SELECT id INTO v_existing FROM public.code_redemptions
   WHERE code_id = v_code.id AND user_id = v_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already redeemed this code');
  END IF;

  -- Global cap for admin codes.
  IF v_code.max_uses IS NOT NULL AND v_code.use_count >= v_code.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has reached its usage limit');
  END IF;

  -- Grant credits
  IF v_code.credits_reward > 0 THEN
    INSERT INTO public.user_credits (user_id, balance)
      VALUES (v_user_id, v_code.credits_reward)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = public.user_credits.balance + v_code.credits_reward,
            updated_at = now()
      RETURNING balance INTO v_new_balance;

    INSERT INTO public.credit_transactions (user_id, amount, type, description)
      VALUES (v_user_id, v_code.credits_reward, 'redeem_code', 'Redeemed code: ' || v_code.code);
  END IF;

  -- Grant Pro days (extend from later of now or current pro_until)
  IF v_code.pro_days_reward > 0 THEN
    UPDATE public.profiles
       SET pro_until = GREATEST(COALESCE(pro_until, now()), now()) + (v_code.pro_days_reward || ' days')::interval,
           updated_at = now()
     WHERE user_id = v_user_id
     RETURNING pro_until INTO v_new_pro_until;
  END IF;

  -- Record redemption + bump count
  INSERT INTO public.code_redemptions (code_id, user_id, credits_granted, pro_days_granted)
    VALUES (v_code.id, v_user_id, v_code.credits_reward, v_code.pro_days_reward);

  UPDATE public.redeem_codes
     SET use_count = use_count + 1
   WHERE id = v_code.id;

  -- Mark linked gift as redeemed
  IF v_code.source = 'gift' THEN
    UPDATE public.gift_purchases
       SET status = 'redeemed', redeemed_at = now()
     WHERE code_id = v_code.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'credits_granted', v_code.credits_reward,
    'pro_days_granted', v_code.pro_days_reward,
    'new_balance', v_new_balance,
    'pro_until', v_new_pro_until
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_code(TEXT) TO authenticated;

-- Helpful index
CREATE INDEX idx_redeem_codes_code_upper ON public.redeem_codes (upper(code));
CREATE INDEX idx_code_redemptions_user ON public.code_redemptions (user_id);
CREATE INDEX idx_gift_purchases_buyer ON public.gift_purchases (buyer_id);
