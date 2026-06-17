ALTER TABLE public.cadastros_clientes ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.cadastros_clientes ADD COLUMN IF NOT EXISTS foto_url text;