
CREATE TABLE public.cadastros_clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  municipio TEXT NOT NULL,
  instagram TEXT,
  observacoes TEXT
);

CREATE INDEX idx_cadastros_clientes_email ON public.cadastros_clientes(email);
CREATE INDEX idx_cadastros_clientes_criado_em ON public.cadastros_clientes(criado_em DESC);

GRANT INSERT ON public.cadastros_clientes TO anon, authenticated;
GRANT ALL ON public.cadastros_clientes TO service_role;

ALTER TABLE public.cadastros_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode se cadastrar"
  ON public.cadastros_clientes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
