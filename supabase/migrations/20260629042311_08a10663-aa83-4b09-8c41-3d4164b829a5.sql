ALTER TABLE public.cadastros_clientes ADD COLUMN IF NOT EXISTS import_batch_id uuid;
CREATE INDEX IF NOT EXISTS idx_cadastros_clientes_import_batch_id ON public.cadastros_clientes(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_cadastros_clientes_criado_em ON public.cadastros_clientes(criado_em);