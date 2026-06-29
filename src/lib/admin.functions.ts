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
        `nome.ilike.${like},email.ilike.${like},telefone.ilike.${like},instagram.ilike.${like},cidade_endereco.ilike.${like},bairro.ilike.${like},uf.ilike.${like}`,
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

const updateSchema = tokenSchema.extend({
  id: z.string().uuid(),
  patch: z.object({
    nome: z.string().trim().min(3).max(120).optional(),
    telefone: z.string().trim().min(8).max(40).optional(),
    cargo: z.string().trim().max(120).nullable().optional(),
    sexo: z.enum(["M", "F"]).nullable().optional(),
    instagram: z.string().trim().max(80).nullable().optional(),
    observacoes: z.string().trim().max(1000).nullable().optional(),
    cep: z.string().trim().max(20).nullable().optional(),
    endereco: z.string().trim().max(200).nullable().optional(),
    bairro: z.string().trim().max(120).nullable().optional(),
    cidade_endereco: z.string().trim().max(120).nullable().optional(),
    uf: z.string().trim().max(2).nullable().optional(),
  }),
});


export const adminUpdateCadastro = createServerFn({ method: "POST" })
  .inputValidator((data) => updateSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("./admin-token.server");
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(data.patch)) {
      if (v === undefined) continue;
      if (typeof v === "string") {
        const t = v.trim();
        patch[k] = t === "" ? null : (k === "uf" ? t.toUpperCase() : t);
      } else {
        patch[k] = v;
      }
    }
    const { data: row, error } = await supabaseAdmin
      .from("cadastros_clientes")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { row };
  });


export const adminGetFotoUrl = createServerFn({ method: "POST" })
  .inputValidator((data) => tokenSchema.extend({ path: z.string().min(1).max(500) }).parse(data))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("./admin-token.server");
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("cadastros-fotos")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

const importRowSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().min(8).max(40),
  cargo: z.string().trim().max(120).nullable().optional(),
  sexo: z.enum(["M", "F"]).nullable().optional(),
  email: z.string().trim().max(160).nullable().optional(),
  instagram: z.string().trim().max(80).nullable().optional(),
  observacoes: z.string().trim().max(1000).nullable().optional(),
  cep: z.string().trim().max(20).nullable().optional(),
  endereco: z.string().trim().max(200).nullable().optional(),
  bairro: z.string().trim().max(120).nullable().optional(),
  cidade_endereco: z.string().trim().max(120).nullable().optional(),
  uf: z.string().trim().max(2).nullable().optional(),
});

export const adminBulkInsert = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    tokenSchema.extend({ rows: z.array(importRowSchema).min(1).max(2000) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { verifyToken } = await import("./admin-token.server");
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { randomUUID } = await import("node:crypto");
    const batchId = randomUUID();
    const payload = data.rows.map((r) => ({
      nome: r.nome,
      telefone: r.telefone,
      cargo: r.cargo ?? null,
      sexo: r.sexo ?? null,
      email: r.email ?? null,
      instagram: r.instagram ?? null,
      observacoes: r.observacoes ?? null,
      cep: r.cep ?? null,
      endereco: r.endereco ?? null,
      bairro: r.bairro ?? null,
      cidade_endereco: r.cidade_endereco ?? null,
      uf: r.uf ? r.uf.toUpperCase() : null,
      import_batch_id: batchId,
    }));
    const { error, count } = await supabaseAdmin
      .from("cadastros_clientes")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any, { count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? payload.length, batchId };
  });

export const adminListImportBatches = createServerFn({ method: "POST" })
  .inputValidator((data) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("./admin-token.server");
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("cadastros_clientes")
      .select("import_batch_id, criado_em")
      .not("import_batch_id", "is", null)
      .order("criado_em", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    const map = new Map<string, { batchId: string; count: number; first: string; last: string }>();
    for (const r of rows ?? []) {
      const id = (r as { import_batch_id: string | null }).import_batch_id;
      const t = (r as { criado_em: string }).criado_em;
      if (!id) continue;
      const cur = map.get(id);
      if (!cur) map.set(id, { batchId: id, count: 1, first: t, last: t });
      else {
        cur.count++;
        if (t < cur.first) cur.first = t;
        if (t > cur.last) cur.last = t;
      }
    }
    const batches = Array.from(map.values()).sort((a, b) => (a.last < b.last ? 1 : -1)).slice(0, 20);
    return { batches };
  });

export const adminDeleteImportBatch = createServerFn({ method: "POST" })
  .inputValidator((data) => tokenSchema.extend({ batchId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("./admin-token.server");
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, count } = await supabaseAdmin
      .from("cadastros_clientes")
      .delete({ count: "exact" })
      .eq("import_batch_id", data.batchId);
    if (error) throw new Error(error.message);
    return { deleted: count ?? 0 };
  });

export const adminDeleteByDateRange = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    tokenSchema.extend({
      from: z.string().min(1),
      to: z.string().min(1),
      onlyImported: z.boolean().optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const { verifyToken } = await import("./admin-token.server");
    const fromD = new Date(data.from);
    const toD = new Date(data.to);
    if (isNaN(fromD.getTime()) || isNaN(toD.getTime()) || fromD >= toD) {
      throw new Error("Intervalo inválido.");
    }
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("cadastros_clientes")
      .delete({ count: "exact" })
      .gte("criado_em", fromD.toISOString())
      .lte("criado_em", toD.toISOString());
    if (data.onlyImported) q = q.not("import_batch_id", "is", null);
    const { error, count } = await q;
    if (error) throw new Error(error.message);
    return { deleted: count ?? 0 };
  });


