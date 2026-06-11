
ALTER TABLE public.cadastros_clientes
  ADD CONSTRAINT nome_len CHECK (char_length(nome) BETWEEN 3 AND 120),
  ADD CONSTRAINT telefone_len CHECK (char_length(telefone) BETWEEN 8 AND 25),
  ADD CONSTRAINT email_len CHECK (char_length(email) BETWEEN 5 AND 160),
  ADD CONSTRAINT municipio_len CHECK (char_length(municipio) BETWEEN 2 AND 120),
  ADD CONSTRAINT instagram_len CHECK (instagram IS NULL OR char_length(instagram) <= 60),
  ADD CONSTRAINT observacoes_len CHECK (observacoes IS NULL OR char_length(observacoes) <= 500);
