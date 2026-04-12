
-- User credits balance table
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  last_daily_grant DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits"
  ON public.user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

-- Credit transaction history
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_grant', 'tool_select', 'interaction', 'purchase', 'subscription')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to grant daily credits (called on login/app load)
CREATE OR REPLACE FUNCTION public.grant_daily_credits(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(10,2);
  v_last_grant DATE;
BEGIN
  -- Upsert user_credits row
  INSERT INTO public.user_credits (user_id, balance, last_daily_grant)
  VALUES (p_user_id, 5.00, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, last_daily_grant INTO v_balance, v_last_grant
  FROM public.user_credits WHERE user_id = p_user_id;

  -- Grant daily credits if not yet granted today
  IF v_last_grant IS NULL OR v_last_grant < CURRENT_DATE THEN
    UPDATE public.user_credits
    SET balance = balance + 5.00, last_daily_grant = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (p_user_id, 5.00, 'daily_grant', 'Daily free credits');

    v_balance := v_balance + 5.00;
  END IF;

  RETURN v_balance;
END;
$$;

-- Function to spend credits
CREATE OR REPLACE FUNCTION public.spend_credits(p_user_id UUID, p_amount NUMERIC, p_type TEXT, p_description TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(10,2);
BEGIN
  SELECT balance INTO v_balance
  FROM public.user_credits WHERE user_id = p_user_id;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN -1; -- insufficient credits
  END IF;

  UPDATE public.user_credits
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, p_type, p_description);

  RETURN v_balance - p_amount;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
