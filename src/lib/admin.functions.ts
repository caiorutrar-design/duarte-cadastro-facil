import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function getSecret() {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Servidor sem senha configurada.");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function issueToken() {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("Sessão inválida.");
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) throw new Error("Sessão expirada.");
  const expected = sign(`v1.${parts[1]}`);
  const a = Buffer.from(parts[2], "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Sessão inválida.");
}

const tokenSchema = z.object({ token: z.string().min(10).max(500) });
const passwordSchema = z.object({ password: z.string().min(1).max(200) });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    const expected = getSecret();
    const a = Buffer.from(data.password);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Senha incorreta.");
    return { token: issueToken(), expiresIn: TOKEN_TTL_SECONDS };
  });

export const adminListCadastros = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    tokenSchema.extend({ search: z.string().max(200).optional() }).parse(data),
  )
  .handler(async ({ data }) => {
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
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("cadastros_clientes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
