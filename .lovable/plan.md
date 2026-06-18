## Mudanças no formulário de cadastro

1. **Remover campo "Município"**
   - Remover o input de Município do formulário em `src/routes/index.tsx`
   - Remover do estado do formulário e do payload de inserção
   - Migração no banco: tornar a coluna `municipio` da tabela `cadastros_clientes` opcional (`DROP NOT NULL`), preservando os dados existentes

2. **Readicionar campo "Observação"**
   - Adicionar de volta o `<Textarea>` "Observações" (opcional) no formulário
   - Restaurar o estado `observacoes` e incluí-lo no insert do Supabase
   - A coluna `observacoes` já existe na tabela, não é necessária migração

3. **Painel admin**
   - Ajustar `src/routes/admin.tsx` para não exibir mais a coluna Município (ou exibir como opcional) e voltar a exibir Observações

Nenhuma outra mudança visual/funcional será feita.