
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Atas','Estatutos','Financeiro','Projetos','Comunicados','Outros')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view documents"
  ON public.documents FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND uploaded_by = auth.uid());

CREATE POLICY "Admins can update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

CREATE INDEX documents_category_idx ON public.documents(category);
CREATE INDEX documents_created_at_idx ON public.documents(created_at DESC);

-- Storage policies for the 'documents' bucket (bucket created via tool)
CREATE POLICY "Approved users can read documents bucket"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_approved(auth.uid()));

CREATE POLICY "Admins can upload to documents bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documents bucket"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete from documents bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
