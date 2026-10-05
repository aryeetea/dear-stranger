CREATE TABLE IF NOT EXISTS public.user_avatar_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  description text,
  presentation text NOT NULL DEFAULT 'Use my description',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_avatar_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_avatar_settings TO authenticated;

DROP POLICY IF EXISTS "Users can read their own avatar settings" ON public.user_avatar_settings;
CREATE POLICY "Users can read their own avatar settings"
  ON public.user_avatar_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own avatar settings" ON public.user_avatar_settings;
CREATE POLICY "Users can create their own avatar settings"
  ON public.user_avatar_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own avatar settings" ON public.user_avatar_settings;
CREATE POLICY "Users can update their own avatar settings"
  ON public.user_avatar_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own avatar settings" ON public.user_avatar_settings;
CREATE POLICY "Users can delete their own avatar settings"
  ON public.user_avatar_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.user_avatar_settings (user_id, description, presentation)
SELECT id, avatar_prompt_pending, COALESCE(avatar_presentation, 'Use my description')
FROM public.hubs
WHERE avatar_prompt_pending IS NOT NULL OR avatar_presentation IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.hubs SET avatar_prompt_pending = NULL WHERE avatar_prompt_pending IS NOT NULL;
ALTER TABLE public.hubs DROP COLUMN IF EXISTS avatar_presentation;
