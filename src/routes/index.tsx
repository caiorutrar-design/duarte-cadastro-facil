import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Instagram, Loader2, CheckCircle2, Phone, Briefcase, User, Search, Camera, X, MessageSquare } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-provider";
import { getWhatsappConfig } from "@/lib/config.functions";
import duarteLogo from "@/assets/duarte-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cadastro Oficial — Duarte Jr." },
      { name: "description", content: "Faça parte do movimento de Duarte Jr. Cadastre-se e receba novidades da pré-candidatura ao Senado." },
      { property: "og:title", content: "Cadastro Oficial — Duarte Jr." },
      { property: "og:description", content: "Faça parte do movimento. Cadastre-se e fique por dentro." },
    ],
  }),
  component: CadastroPage,
});


function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

type ViaCep = {
  cep?: string; logradouro?: string; bairro?: string;
  localidade?: string; uf?: string; erro?: boolean;
};

// Letras sobre o gradiente do hero ficam brancas em ambos os modos para melhor leitura.
const heroTextClass = "text-white drop-shadow-sm";
const heroMutedClass = "text-white/80";

function CadastroPage() {
  const [form, setForm] = useState({
    nome: "", telefone: "", cargo: "", sexo: "" as "" | "M" | "F",
    instagram: "", observacoes: "",
    cep: "", endereco: "", bairro: "", cidade_endereco: "", uf: "",
  });

  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [whats, setWhats] = useState<{ number: string; message: string } | null>(null);

  const getCfg = useServerFn(getWhatsappConfig);
  useEffect(() => {
    getCfg().then(setWhats).catch(() => setWhats(null));
  }, [getCfg]);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5MB.");
      return;
    }
    setFoto(file);
    setFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearFoto() {
    setFoto(null);
    setFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  }

  async function buscarCep(cepValue: string) {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: ViaCep = await res.json();
      if (data.erro) {
        toast.info("CEP não encontrado. Preencha o endereço manualmente abaixo.");
        return;
      }
      setForm((p) => ({
        ...p,
        endereco: data.logradouro ?? "",
        bairro: data.bairro ?? "",
        cidade_endereco: data.localidade ?? "",
        uf: data.uf ?? "",
      }));
      toast.success("Endereço encontrado!");
    } catch {
      toast.error("Falha ao consultar CEP. Preencha o endereço manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.nome.trim().length < 3) return toast.error("Informe seu nome completo (mín. 3 caracteres).");
    if (form.telefone.replace(/\D/g, "").length < 10) return toast.error("Telefone inválido. Use (XX) XXXXX-XXXX.");

    setLoading(true);
    try {
      let foto_url: string | null = null;
      if (foto) {
        const rawExt = foto.name.split(".").pop()?.toLowerCase() || "jpg";
        const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";
        const path = `uploads/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("cadastros-fotos")
          .upload(path, foto, { contentType: foto.type, upsert: false });
        if (upErr) {
          console.error(upErr);
          toast.error("Falha ao enviar a foto. Tente novamente.");
          return;
        }
        foto_url = path;
      }

      const ig = form.instagram.trim().replace(/^@+/, "");
      const { error } = await supabase.from("cadastros_clientes").insert({
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        cargo: form.cargo.trim() || null,
        sexo: form.sexo || null,
        instagram: ig ? `@${ig}` : null,
        observacoes: form.observacoes.trim() || null,
        cep: form.cep.trim() || null,
        endereco: form.endereco.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade_endereco: form.cidade_endereco.trim() || null,
        uf: form.uf.trim().toUpperCase() || null,
        foto_url,
      });


      if (error) {
        console.error(error);
        toast.error("Não foi possível concluir seu cadastro. Tente novamente.");
        return;
      }

      toast.success("Cadastro realizado com sucesso!");
      setSuccess(true);
      setForm({
        nome: "", telefone: "", cargo: "", sexo: "",
        instagram: "", observacoes: "",
        cep: "", endereco: "", bairro: "", cidade_endereco: "", uf: "",
      });

      clearFoto();
    } catch (err) {
      console.error(err);
      toast.error("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Toaster richColors position="top-center" />

      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, oklch(0.88 0.18 95 / 0.35), transparent 40%), radial-gradient(circle at 85% 80%, oklch(0.58 0.23 27 / 0.25), transparent 40%)",
        }}
      />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <Link
          to="/admin"
          className="inline-flex rounded-full border border-white/40 bg-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur transition hover:bg-white/25 sm:px-4"
        >
          Admin
        </Link>
        <ThemeToggle />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-12 sm:py-16">
        <header className="mb-8 flex flex-col items-center text-center">
          <img src={duarteLogo} alt="Duarte Jr." className="h-20 w-auto drop-shadow-2xl sm:h-24" />
          <p className={`mt-4 max-w-xl text-sm font-medium uppercase tracking-[0.2em] sm:text-base ${heroMutedClass}`}>
            Movimento Duarte • Cadastro Oficial
          </p>
          <h1 className={`mt-2 max-w-2xl text-2xl font-bold sm:text-4xl ${heroTextClass}`}>
            Vamos juntos construir essa caminhada.
          </h1>
        </header>

        <section className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-[var(--shadow-elegant)] ring-1 ring-black/5 sm:p-10 dark:ring-white/5">
          {success ? (
            <SuccessState onReset={() => setSuccess(false)} whats={whats} />
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Faça parte do movimento</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Preencha seus dados para receber novidades, convites para encontros e mobilizações em sua região.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <Field id="nome" label="Nome completo" required icon={<User className="size-4" />}>
                  <Input id="nome" type="text" autoComplete="name" required minLength={3} maxLength={120}
                    placeholder="Como você gostaria de ser chamado(a)"
                    value={form.nome} onChange={(e) => update("nome", e.target.value)} className="pl-10" />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="telefone" label="Telefone / WhatsApp" required icon={<Phone className="size-4" />}>
                    <Input id="telefone" type="tel" inputMode="tel" autoComplete="tel" required
                      placeholder="(00) 00000-0000" value={form.telefone}
                      onChange={(e) => update("telefone", maskPhone(e.target.value))} className="pl-10" />
                  </Field>
                  <Field id="cargo" label="Cargo / Profissão (opcional)" icon={<Briefcase className="size-4" />}>
                    <Input id="cargo" type="text" maxLength={120}
                      placeholder="Ex: Professor, Comerciante" value={form.cargo}
                      onChange={(e) => update("cargo", e.target.value)} className="pl-10" />
                  </Field>
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm font-semibold text-foreground">Sexo (opcional)</Label>
                  <div className="flex gap-2">
                    {[
                      { v: "M", l: "Masculino" },
                      { v: "F", l: "Feminino" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, sexo: p.sexo === opt.v ? "" : (opt.v as "M" | "F") }))}
                        className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition ${
                          form.sexo === opt.v
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>


                {/* Foto do cadastrado */}
                <Field id="foto" label="Foto (opcional)" icon={<Camera className="size-4" />} hideIconOnInput>
                  <div className="flex items-center gap-4">
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/40">
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Pré-visualização" className="size-full object-cover" />
                      ) : (
                        <Camera className="size-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fotoInputRef}
                        id="foto"
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleFotoChange}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => fotoInputRef.current?.click()}>
                        {foto ? "Trocar foto" : "Enviar foto"}
                      </Button>
                      {foto && (
                        <Button type="button" variant="ghost" size="sm" onClick={clearFoto} className="text-destructive hover:text-destructive">
                          <X className="mr-1 size-3" /> Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </Field>

                {/* CEP + endereço (sempre editável manualmente) */}
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Informe o CEP para preencher automaticamente — ou digite o endereço manualmente nos campos abaixo.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                    <Field id="cep" label="CEP" icon={<Search className="size-4" />}>
                      <Input
                        id="cep" inputMode="numeric" placeholder="00000-000" maxLength={9}
                        value={form.cep}
                        onChange={(e) => {
                          const masked = maskCep(e.target.value);
                          update("cep", masked);
                          if (masked.replace(/\D/g, "").length === 8) buscarCep(masked);
                        }}
                        className="pl-10"
                      />
                      {cepLoading && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="size-3 animate-spin" /> Buscando endereço...
                        </p>
                      )}
                    </Field>
                    <Field id="endereco" label="Endereço">
                      <Input id="endereco" placeholder="Rua, número, complemento"
                        value={form.endereco} onChange={(e) => update("endereco", e.target.value)} maxLength={200} />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1.5fr_1.5fr_0.5fr]">
                    <Field id="bairro" label="Bairro">
                      <Input id="bairro" placeholder="Bairro" value={form.bairro}
                        onChange={(e) => update("bairro", e.target.value)} maxLength={120} />
                    </Field>
                    <Field id="cidade_endereco" label="Cidade">
                      <Input id="cidade_endereco" placeholder="Cidade" value={form.cidade_endereco}
                        onChange={(e) => update("cidade_endereco", e.target.value)} maxLength={120} />
                    </Field>
                    <Field id="uf" label="UF">
                      <Input id="uf" placeholder="UF" value={form.uf} maxLength={2}
                        onChange={(e) => update("uf", e.target.value.toUpperCase())} />
                    </Field>
                  </div>
                </div>

                <Field id="instagram" label="Instagram (opcional)" icon={<Instagram className="size-4" />}>
                  <div className="relative">
                    <Input id="instagram" type="text" maxLength={60} placeholder="seu_usuario"
                      value={form.instagram}
                      onChange={(e) => update("instagram", e.target.value.replace(/^@+/, ""))}
                      className="pl-16" />
                    <span className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">@</span>
                  </div>
                </Field>

                <Field id="observacoes" label="Observação (opcional)" icon={<MessageSquare className="size-4" />}>
                  <Textarea
                    id="observacoes"
                    placeholder="Conte algo que queira que nossa equipe saiba"
                    value={form.observacoes}
                    onChange={(e) => update("observacoes", e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="pl-10"
                  />
                </Field>

                <Button type="submit" disabled={loading}
                  className="h-12 w-full text-base font-semibold tracking-wide text-white shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
                  style={{ background: "var(--gradient-hero)" }}>
                  {loading ? (<><Loader2 className="mr-2 size-5 animate-spin" />Enviando cadastro...</>) : "Quero fazer parte"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Seus dados serão utilizados exclusivamente para comunicação da campanha.
                </p>
              </form>
            </>
          )}
        </section>

        <footer className={`mt-8 text-center text-xs ${heroMutedClass}`}>
          © {new Date().getFullYear()} Duarte Jr. • Todos os direitos reservados
        </footer>
      </main>
    </div>
  );
}

function Field({ id, label, required, icon, children, hideIconOnInput }: {
  id: string; label: string; required?: boolean; icon?: React.ReactNode;
  children: React.ReactNode; hideIconOnInput?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}{required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        {icon && !hideIconOnInput && (
          <span className="pointer-events-none absolute left-3 top-[1.15rem] -translate-y-1/2 text-muted-foreground">{icon}</span>
        )}
        {children}
      </div>
    </div>
  );
}

function SuccessState({ onReset, whats }: { onReset: () => void; whats: { number: string; message: string } | null }) {
  const hasWhats = !!(whats && whats.number && whats.number.length >= 10);
  const waUrl = hasWhats
    ? `https://wa.me/${whats!.number}?text=${encodeURIComponent(whats!.message || "")}`
    : "";

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-full" style={{ background: "var(--gradient-hero)" }}>
        <CheckCircle2 className="size-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Cadastro confirmado!</h2>
      <p className="mt-3 max-w-md text-muted-foreground">
        Obrigado por se juntar ao movimento. Em breve nossa equipe entrará em contato com novidades e convites para mobilizações na sua região.
      </p>

      {hasWhats && (
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-border bg-muted/40 p-5">
          <p className="text-sm font-semibold text-foreground">Fale com nossa equipe no WhatsApp</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aponte a câmera do seu celular para o QR code abaixo ou toque no botão.
          </p>
          <div className="mt-4 flex justify-center rounded-xl bg-white p-4 shadow-inner">
            <QRCodeCanvas value={waUrl} size={180} includeMargin={false} level="M" />
          </div>
          <p className="mt-3 text-xs italic text-muted-foreground">
            "{whats!.message}"
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--gradient-hero)" }}
          >
            Abrir no WhatsApp
          </a>
        </div>
      )}

      <Button onClick={onReset} variant="outline" className="mt-6">Fazer novo cadastro</Button>
    </div>
  );
}
