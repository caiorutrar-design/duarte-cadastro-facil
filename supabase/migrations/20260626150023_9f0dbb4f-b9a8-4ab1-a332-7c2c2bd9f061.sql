ALTER TABLE public.cadastros_clientes
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS sexo text CHECK (sexo IN ('M','F'));