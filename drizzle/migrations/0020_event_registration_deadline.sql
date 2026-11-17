ALTER TABLE public.events ADD COLUMN registration_deadline timestamptz;
COMMENT ON COLUMN public.events.registration_deadline IS 'Data e hora limite para confirmar presenca no evento (opcional).';