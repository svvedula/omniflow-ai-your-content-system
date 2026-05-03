CREATE TABLE public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'processing',
  analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bank statements" ON public.bank_statements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bank statements" ON public.bank_statements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own bank statements" ON public.bank_statements FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own bank statements" ON public.bank_statements FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_bank_statements_user ON public.bank_statements(user_id, created_at DESC);