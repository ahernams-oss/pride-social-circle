ALTER TABLE public.user_role_history ADD COLUMN start_date DATE, ADD COLUMN end_date DATE;
UPDATE public.user_role_history SET start_date = make_date(start_year, 1, 1) WHERE start_date IS NULL AND start_year IS NOT NULL;
UPDATE public.user_role_history SET end_date = make_date(end_year, 12, 31) WHERE end_date IS NULL AND end_year IS NOT NULL;
ALTER TABLE public.user_role_history ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE public.user_role_history ALTER COLUMN start_year DROP NOT NULL;