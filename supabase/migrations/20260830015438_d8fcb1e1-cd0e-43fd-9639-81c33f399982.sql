ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_done boolean NOT NULL DEFAULT false;