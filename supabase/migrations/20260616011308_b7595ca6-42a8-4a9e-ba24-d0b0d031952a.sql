
CREATE TYPE public.election_type AS ENUM ('single','yes_no','multiple_choice','multi_position');
CREATE TYPE public.election_status AS ENUM ('draft','open','closed');

CREATE TABLE public.elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type public.election_type NOT NULL,
  status public.election_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_choices INT NOT NULL DEFAULT 1,
  allow_kiosk BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elections TO authenticated;
GRANT ALL ON public.elections TO service_role;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved view elections" ON public.elections FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "admin manage elections" ON public.elections FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tg_elections_updated BEFORE UPDATE ON public.elections FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

CREATE TABLE public.election_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.election_positions TO authenticated;
GRANT ALL ON public.election_positions TO service_role;
ALTER TABLE public.election_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved view positions" ON public.election_positions FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "admin manage positions" ON public.election_positions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.election_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.election_positions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.election_candidates TO authenticated;
GRANT ALL ON public.election_candidates TO service_role;
ALTER TABLE public.election_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved view candidates" ON public.election_candidates FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "admin manage candidates" ON public.election_candidates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_sessions TO authenticated;
GRANT ALL ON public.kiosk_sessions TO service_role;
ALTER TABLE public.kiosk_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage kiosk" ON public.kiosk_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.election_ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kiosk_session_id UUID REFERENCES public.kiosk_sessions(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (election_id, voter_id)
);
GRANT SELECT, INSERT ON public.election_ballots TO authenticated;
GRANT ALL ON public.election_ballots TO service_role;
ALTER TABLE public.election_ballots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voter inserts own ballot" ON public.election_ballots FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND public.is_approved(auth.uid())
    AND EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.status = 'open'));
CREATE POLICY "voter sees own ballot" ON public.election_ballots FOR SELECT TO authenticated
  USING (voter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ballot_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id UUID NOT NULL REFERENCES public.election_ballots(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.election_positions(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.election_candidates(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ballot_choices TO authenticated;
GRANT ALL ON public.ballot_choices TO service_role;
ALTER TABLE public.ballot_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voter inserts own choices" ON public.ballot_choices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.election_ballots b WHERE b.id = ballot_id AND b.voter_id = auth.uid()));
CREATE POLICY "voter sees own choices" ON public.ballot_choices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.election_ballots b WHERE b.id = ballot_id AND (b.voter_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE OR REPLACE FUNCTION public.election_results(_election_id UUID)
RETURNS TABLE(position_id UUID, position_name TEXT, candidate_id UUID, candidate_name TEXT, value TEXT, votes BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, c.id, c.name, bc.value, COUNT(*)::bigint AS votes
  FROM public.ballot_choices bc
  JOIN public.election_ballots b ON b.id = bc.ballot_id
  LEFT JOIN public.election_candidates c ON c.id = bc.candidate_id
  LEFT JOIN public.election_positions p ON p.id = bc.position_id
  WHERE b.election_id = _election_id
    AND (public.has_role(auth.uid(),'admin')
         OR EXISTS (SELECT 1 FROM public.elections e WHERE e.id = _election_id AND e.status='closed'))
  GROUP BY p.id, p.name, c.id, c.name, bc.value
  ORDER BY p.name NULLS FIRST, COUNT(*) DESC;
$$;
GRANT EXECUTE ON FUNCTION public.election_results(UUID) TO authenticated;
