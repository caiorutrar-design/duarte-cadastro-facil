
CREATE TABLE public.configuracoes_app (
  chave text PRIMARY KEY,
  valor text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracoes_app TO anon, authenticated;
GRANT ALL ON public.configuracoes_app TO service_role;

ALTER TABLE public.configuracoes_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública das configurações"
  ON public.configuracoes_app FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.configuracoes_app (chave, valor) VALUES
  ('whatsapp_number', ''),
  ('whatsapp_message', 'Oi equipe, obrigado pelo Atendimento. Avante Duarte 700')
ON CONFLICT (chave) DO NOTHING;
