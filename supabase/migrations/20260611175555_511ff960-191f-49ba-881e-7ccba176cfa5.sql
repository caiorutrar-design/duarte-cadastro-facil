
ALTER TABLE public.cadastros_clientes
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade_endereco TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT;

ALTER TABLE public.cadastros_clientes
  ADD CONSTRAINT cep_len CHECK (cep IS NULL OR char_length(cep) <= 12),
  ADD CONSTRAINT endereco_len CHECK (endereco IS NULL OR char_length(endereco) <= 200),
  ADD CONSTRAINT bairro_len CHECK (bairro IS NULL OR char_length(bairro) <= 120),
  ADD CONSTRAINT cidade_endereco_len CHECK (cidade_endereco IS NULL OR char_length(cidade_endereco) <= 120),
  ADD CONSTRAINT uf_len CHECK (uf IS NULL OR char_length(uf) <= 2);

-- E-mail único (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS cadastros_clientes_email_unique
  ON public.cadastros_clientes (lower(email));
