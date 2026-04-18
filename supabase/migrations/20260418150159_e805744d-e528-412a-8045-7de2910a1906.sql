CREATE OR REPLACE FUNCTION public.grant_daily_credits(p_user_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC(10,2);
  v_last_grant DATE;
  v_month_start DATE;
  v_granted_this_month NUMERIC(10,2);
  v_remaining_cap NUMERIC(10,2);
  v_grant_amount NUMERIC(10,2);
BEGIN
  v_month_start := date_trunc('month', CURRENT_DATE)::date;

  -- Upsert user_credits row (no initial grant; handled below)
  INSERT INTO public.user_credits (user_id, balance, last_daily_grant)
  VALUES (p_user_id, 0.00, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, last_daily_grant INTO v_balance, v_last_grant
  FROM public.user_credits WHERE user_id = p_user_id;

  -- Only grant once per calendar day (requires actual login -> this is called on session)
  IF v_last_grant IS NULL OR v_last_grant < CURRENT_DATE THEN
    -- Sum daily grants already issued this month
    SELECT COALESCE(SUM(amount), 0) INTO v_granted_this_month
    FROM public.credit_transactions
    WHERE user_id = p_user_id
      AND type = 'daily_grant'
      AND created_at >= v_month_start;

    v_remaining_cap := 50.00 - v_granted_this_month;

    IF v_remaining_cap <= 0 THEN
      -- Monthly cap reached; mark today as granted to avoid re-checks but give 0
      UPDATE public.user_credits
      SET last_daily_grant = CURRENT_DATE, updated_at = now()
      WHERE user_id = p_user_id;
    ELSE
      v_grant_amount := LEAST(5.00, v_remaining_cap);

      UPDATE public.user_credits
      SET balance = balance + v_grant_amount,
          last_daily_grant = CURRENT_DATE,
          updated_at = now()
      WHERE user_id = p_user_id;

      INSERT INTO public.credit_transactions (user_id, amount, type, description)
      VALUES (p_user_id, v_grant_amount, 'daily_grant',
              CASE WHEN v_grant_amount < 5.00
                   THEN 'Daily login credits (monthly cap reached)'
                   ELSE 'Daily login credits' END);

      v_balance := v_balance + v_grant_amount;
    END IF;
  END IF;

  RETURN v_balance;
END;
$function$;