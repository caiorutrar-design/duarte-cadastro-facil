## Objetivo

Três ajustes na página de cadastro do movimento Duarte Jr.:

1. Permitir preencher endereço manualmente, mesmo quando o CEP não traz resultado.
2. Ativar modo noturno por padrão e ajustar textos que ficam brancos para azul quando o tema mudar (para garantir contraste).
3. Após o cadastro, mostrar um QR code do WhatsApp com mensagem pré-definida, apontando para um número configurável pelo administrador.

---

## 1. Endereço sempre editável

- Os campos **Endereço, Bairro, Cidade, UF** já existem no formulário.
- Hoje, quando o CEP retorna erro, exibimos apenas um toast e os campos ficam vazios. Vou ajustar para:
  - Continuar exibindo o aviso "CEP não encontrado", mas com texto orientando: *"Preencha o endereço manualmente abaixo"*.
  - Garantir que os campos de endereço fiquem sempre habilitados (sem `disabled`) e aceitem digitação livre, independentemente da resposta do ViaCEP.
  - Permitir o envio do cadastro mesmo sem CEP válido (CEP continua opcional).

## 2. Modo noturno padrão + contraste das fontes

- No `ThemeProvider`, alterar o tema inicial padrão para `"dark"` (mantendo a preferência salva em `localStorage` se já existir).
- Hoje vários textos do hero (cabeçalho, rótulo "Movimento Duarte", título principal, footer, botão Admin, ThemeToggle) usam `text-white` fixo. No modo claro, isso fica legível sobre o gradiente azul. No modo noturno, o usuário pediu para esses textos virarem **azul**.
- Vou trocar essas classes por uma combinação responsiva ao tema, por exemplo: `text-white dark:text-[hsl(var(--duarte-blue))]` (e equivalentes para borda/fundo do toggle e do botão Admin), garantindo contraste em ambos os modos.
- Revisar também o fundo do hero/gradiente para que, no modo noturno, a leitura em azul faça sentido (ajustar opacidade do gradiente ou usar um fundo mais claro no modo escuro especificamente para o topo).

## 3. QR code de WhatsApp ao final do cadastro

### Comportamento para o usuário final
- Ao concluir o cadastro com sucesso, na tela `SuccessState`:
  - Mostrar um **QR code** que, ao ser escaneado, abre o WhatsApp do número configurado, já com a mensagem pré-preenchida:
    > "Oi equipe, obrigado pelo Atendimento. Avante Duarte 700"
  - Mostrar também um botão "Abrir no WhatsApp" como alternativa para quem está no celular.
  - URL usada: `https://wa.me/<numero>?text=<mensagem-urlencoded>`.

### Configuração pelo administrador
- Criar uma nova tabela `configuracoes_app` (chave/valor) para guardar `whatsapp_number` e `whatsapp_message`.
- Na página `/admin`, adicionar uma seção **"Configurações de WhatsApp"** com dois campos:
  - Número do WhatsApp (com DDI/DDD, ex.: `5598999999999`)
  - Mensagem padrão (pré-preenchida com a frase acima)
  - Botão "Salvar configuração".
- Leitura: a página de cadastro busca essa configuração ao montar (server function pública) para gerar o link/QR code. Se não estiver configurado, mostra apenas a mensagem de sucesso sem QR code.

### Geração do QR code
- Usar a biblioteca `qrcode.react` (leve, sem dependências nativas, compatível com o runtime atual).

---

## Detalhes técnicos

- **Arquivos a alterar**
  - `src/components/theme-provider.tsx` — default `"dark"`.
  - `src/routes/index.tsx` — cores responsivas ao tema, ajuste do fluxo de CEP, exibição do QR code no `SuccessState`, fetch da configuração.
  - `src/routes/admin.tsx` — nova seção de configuração de WhatsApp.
  - `src/lib/admin.functions.ts` (ou novo `src/lib/config.functions.ts`) — server functions `getWhatsappConfig` (pública) e `saveWhatsappConfig` (protegida por `ADMIN_PASSWORD`).
- **Migração nova**
  - Tabela `public.configuracoes_app` (`chave text primary key`, `valor text`, `atualizado_em timestamptz`).
  - GRANTs: `select` para `anon, authenticated` (config pública não sensível); `all` para `service_role`. RLS habilitada com política de leitura pública; escrita só via server function admin (service role).
- **Dependência nova**: `qrcode.react`.
- Nada muda no schema de `cadastros_clientes`.
