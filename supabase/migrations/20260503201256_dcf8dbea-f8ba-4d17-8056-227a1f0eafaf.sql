
-- Action OS tasks
CREATE TABLE public.action_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'user',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.action_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.action_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.action_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.action_tasks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_action_tasks_updated BEFORE UPDATE ON public.action_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily briefing preferences
CREATE TABLE public.briefing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  niche TEXT,
  send_hour_utc INT NOT NULL DEFAULT 13,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.briefing_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.briefing_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.briefing_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.briefing_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.briefing_preferences FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_briefing_prefs_updated BEFORE UPDATE ON public.briefing_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Competitive Watchtower
CREATE TABLE public.watchtower_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  last_snapshot TEXT,
  last_checked_at TIMESTAMPTZ,
  last_change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.watchtower_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.watchtower_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.watchtower_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.watchtower_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.watchtower_targets FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_watchtower_updated BEFORE UPDATE ON public.watchtower_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pitch decks
CREATE TABLE public.pitch_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Deck',
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pitch_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.pitch_decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.pitch_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.pitch_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.pitch_decks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_pitch_decks_updated BEFORE UPDATE ON public.pitch_decks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Financial models
CREATE TABLE public.financial_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Model',
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.financial_models FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.financial_models FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.financial_models FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.financial_models FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_financial_models_updated BEFORE UPDATE ON public.financial_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
