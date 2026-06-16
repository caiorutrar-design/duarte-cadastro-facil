import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().min(10).max(500) });
const passwordSchema = z.object({ password: z.string().min(1).max(200) });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyPassword, issueToken } = await import("./admin-token.server");
    verifyPassword(data.password);
    return issueToken();
  });

export const adminListCadastros = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    tokenSchema.extend({ search: z.string().max(200).optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { verifyToken } = await import("./admin-token.server");
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("cadastros_clientes")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(500);

    const s = data.search?.trim();
    if (s) {
      const like = `%${s.replace(/[%_]/g, "")}%`;
      query = query.or(
        `nome.ilike.${like},email.ilike.${like},telefone.ilike.${like},municipio.ilike.${like},cidade_endereco.ilike.${like}`,
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const adminDeleteCadastro = createServerFn({ method: "POST" })
  .inputValidator((data) => tokenSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("./admin-token.server");
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("cadastros_clientes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
