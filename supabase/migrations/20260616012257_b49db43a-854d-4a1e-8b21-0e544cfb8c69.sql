
-- ENUMS
CREATE TYPE public.vf_status_eleicao AS ENUM ('configurando','credenciamento','votacao_aberta','votacao_encerrada','apurada');
CREATE TYPE public.vf_status_candidatura AS ENUM ('ativa','indeferida','desistencia');
CREATE TYPE public.vf_tipo_delegado AS ENUM ('titular','suplente','nato');
CREATE TYPE public.vf_funcao_comissao AS ENUM ('presidente','vice_presidente','membro','vogal');
CREATE TYPE public.vf_tipo_voto AS ENUM ('sim','nao','nulo','candidato');

-- ELEICOES
CREATE TABLE public.vf_eleicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  distrito TEXT,
  data_eleicao DATE NOT NULL,
  status vf_status_eleicao NOT NULL DEFAULT 'configurando',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vf_eleicoes TO authenticated;
GRANT ALL ON public.vf_eleicoes TO service_role;
ALTER TABLE public.vf_eleicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view vf_eleicoes" ON public.vf_eleicoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage vf_eleicoes" ON public.vf_eleicoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER vf_eleicoes_updated_at BEFORE UPDATE ON public.vf_eleicoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- CANDIDATURAS
CREATE TABLE public.vf_candidaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleicao_id UUID NOT NULL REFERENCES public.vf_eleicoes(id) ON DELETE CASCADE,
  associado_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  numero TEXT,
  foto_url TEXT,
  proposta TEXT,
  status vf_status_candidatura NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vf_candidaturas TO authenticated;
GRANT ALL ON public.vf_candidaturas TO service_role;
ALTER TABLE public.vf_candidaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view vf_candidaturas" ON public.vf_candidaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage vf_candidaturas" ON public.vf_candidaturas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER vf_candidaturas_updated_at BEFORE UPDATE ON public.vf_candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- DELEGADOS
CREATE TABLE public.vf_delegados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleicao_id UUID NOT NULL REFERENCES public.vf_eleicoes(id) ON DELETE CASCADE,
  associado_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  clube TEXT,
  tipo vf_tipo_delegado NOT NULL DEFAULT 'titular',
  codigo_acesso TEXT NOT NULL UNIQUE,
  credenciado BOOLEAN NOT NULL DEFAULT false,
  presente BOOLEAN NOT NULL DEFAULT false,
  habilitado_votar BOOLEAN NOT NULL DEFAULT false,
  suplente_acionado BOOLEAN NOT NULL DEFAULT false,
  ja_votou BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vf_delegados TO authenticated;
GRANT ALL ON public.vf_delegados TO service_role;
ALTER TABLE public.vf_delegados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view own delegado or admin" ON public.vf_delegados FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR associado_id = auth.uid());
CREATE POLICY "admin manage vf_delegados" ON public.vf_delegados FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER vf_delegados_updated_at BEFORE UPDATE ON public.vf_delegados
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- COMISSAO
CREATE TABLE public.vf_comissao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleicao_id UUID NOT NULL REFERENCES public.vf_eleicoes(id) ON DELETE CASCADE,
  associado_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  funcao vf_funcao_comissao NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vf_comissao TO authenticated;
GRANT ALL ON public.vf_comissao TO service_role;
ALTER TABLE public.vf_comissao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view vf_comissao" ON public.vf_comissao FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage vf_comissao" ON public.vf_comissao FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- VOTOS
CREATE TABLE public.vf_votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleicao_id UUID NOT NULL REFERENCES public.vf_eleicoes(id) ON DELETE CASCADE,
  candidatura_id UUID REFERENCES public.vf_candidaturas(id) ON DELETE CASCADE,
  delegado_id UUID NOT NULL REFERENCES public.vf_delegados(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL,
  tipo vf_tipo_voto NOT NULL,
  dispositivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(delegado_id, cargo)
);
GRANT SELECT, INSERT ON public.vf_votos TO authenticated;
GRANT ALL ON public.vf_votos TO service_role;
ALTER TABLE public.vf_votos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin or closed view votos" ON public.vf_votos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.vf_eleicoes e WHERE e.id = eleicao_id AND e.status IN ('votacao_encerrada','apurada')));
CREATE POLICY "delegado habilitado insert voto" ON public.vf_votos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vf_delegados d
      JOIN public.vf_eleicoes e ON e.id = d.eleicao_id
      WHERE d.id = delegado_id
        AND d.eleicao_id = vf_votos.eleicao_id
        AND d.habilitado_votar = true
        AND e.status = 'votacao_aberta'
    )
  );

-- AUDITORIA
CREATE TABLE public.vf_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  modulo TEXT NOT NULL,
  entidade TEXT,
  entidade_id UUID,
  detalhes JSONB,
  dispositivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vf_auditoria TO authenticated;
GRANT ALL ON public.vf_auditoria TO service_role;
ALTER TABLE public.vf_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view auditoria" ON public.vf_auditoria FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth insert own audit" ON public.vf_auditoria FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Apuração: contagem por cargo/candidatura
CREATE OR REPLACE FUNCTION public.vf_apuracao(_eleicao_id UUID)
RETURNS TABLE(cargo TEXT, candidatura_id UUID, candidato TEXT, tipo vf_tipo_voto, votos BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.cargo, c.id, COALESCE(c.nome, v.tipo::text) AS candidato, v.tipo, COUNT(*)::bigint
  FROM public.vf_votos v
  LEFT JOIN public.vf_candidaturas c ON c.id = v.candidatura_id
  WHERE v.eleicao_id = _eleicao_id
    AND (public.has_role(auth.uid(),'admin')
         OR EXISTS (SELECT 1 FROM public.vf_eleicoes e WHERE e.id = _eleicao_id AND e.status IN ('votacao_encerrada','apurada')))
  GROUP BY v.cargo, c.id, c.nome, v.tipo
  ORDER BY v.cargo, COUNT(*) DESC;
$$;

-- Marca delegado como já votou após inserção
CREATE OR REPLACE FUNCTION public.vf_tg_after_voto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.vf_delegados SET ja_votou = true WHERE id = NEW.delegado_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER vf_after_voto AFTER INSERT ON public.vf_votos
  FOR EACH ROW EXECUTE FUNCTION public.vf_tg_after_voto();
