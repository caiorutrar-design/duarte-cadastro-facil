-- Remove eventuais duplicatas mantendo o registro mais antigo
DELETE FROM public.cadastros_clientes a
USING public.cadastros_clientes b
WHERE a.telefone = b.telefone
  AND a.criado_em > b.criado_em;

CREATE UNIQUE INDEX IF NOT EXISTS cadastros_clientes_telefone_unique
  ON public.cadastros_clientes (telefone);