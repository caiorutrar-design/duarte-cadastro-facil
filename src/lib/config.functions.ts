import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyToken } from "./admin.functions";

export const getWhatsappConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("configuracoes_app")
    .select("chave, valor")
    .in("chave", ["whatsapp_number", "whatsapp_message"]);
  if (error) throw new Error(error.message);
  const map = Object.fromEntries((data ?? []).map((r: { chave: string; valor: string | null }) => [r.chave, r.valor ?? ""]));
  return {
    number: map.whatsapp_number ?? "",
    message: map.whatsapp_message ?? "",
  };
});

export const saveWhatsappConfig = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().min(10).max(500),
        number: z.string().max(20).regex(/^\d*$/, "Apenas dígitos."),
        message: z.string().max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = [
      { chave: "whatsapp_number", valor: data.number, atualizado_em: new Date().toISOString() },
      { chave: "whatsapp_message", valor: data.message, atualizado_em: new Date().toISOString() },
    ];
    const { error } = await supabaseAdmin.from("configuracoes_app").upsert(rows, { onConflict: "chave" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

