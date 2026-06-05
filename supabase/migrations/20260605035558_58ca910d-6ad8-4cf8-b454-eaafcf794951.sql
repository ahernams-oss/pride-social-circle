ALTER TABLE public.clubs ALTER COLUMN district SET DEFAULT 'LC-11';
UPDATE public.clubs SET district = 'LC-11' WHERE district IS NULL OR district = '';