import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Instagram, Loader2, CheckCircle2, MapPin, Phone, Mail, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

// Municípios do Maranhão (lista resumida dos principais)
const MUNICIPIOS_MA = [
  "São Luís", "Imperatriz", "São José de Ribamar", "Timon", "Caxias", "Codó",
  "Paço do Lumiar", "Açailândia", "Bacabal", "Balsas", "Barra do Corda",
  "Santa Inês", "Pinheiro", "Chapadinha", "Itapecuru-Mirim", "Coroatá",
  "Buriticupu", "Grajaú", "Pedreiras", "Estreito", "Tutóia", "Rosário",
  "Viana", "Zé Doca", "São João dos Patos", "Presidente Dutra", "Barreirinhas",
  "Cururupu", "Vargem Grande", "Santa Luzia", "Lago da Pedra", "Outro",
];

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function CadastroPage() {
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    municipio: "",
    municipioBusca: "",
    instagram: "",
    observacoes: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const sugestoes = useMemo(() => {
    const q = form.municipioBusca.trim().toLowerCase();
    if (!q) return [];
    return MUNICIPIOS_MA.filter((m) => m.toLowerCase().includes(q)).slice(0, 6);
  }, [form.municipioBusca]);

  const obsRestantes = 500 - form.observacoes.length;

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.nome.trim().length < 3) {
      toast.error("Informe seu nome completo (mín. 3 caracteres).");
      return;
    }
    const telDigits = form.telefone.replace(/\D/g, "");
    if (telDigits.length < 10) {
      toast.error("Telefone inválido. Use o formato (XX) XXXXX-XXXX.");
      return;
    }
    if (!form.municipio.trim()) {
      toast.error("Selecione ou informe seu município.");
      return;
    }

    setLoading(true);
    try {
      const instagramClean = form.instagram.trim().replace(/^@+/, "");
      const { error } = await supabase.from("cadastros_clientes").insert({
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim().toLowerCase(),
        municipio: form.municipio.trim(),
        instagram: instagramClean ? `@${instagramClean}` : null,
        observacoes: form.observacoes.trim() || null,
      });

      if (error) {
        console.error(error);
        toast.error("Não foi possível concluir seu cadastro. Tente novamente em instantes.");
        return;
      }

      toast.success("Cadastro realizado com sucesso!");
      setSuccess(true);
      setForm({
        nome: "", telefone: "", email: "", municipio: "",
        municipioBusca: "", instagram: "", observacoes: "",
      });
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

      {/* Backdrop com gradiente da marca */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, oklch(0.88 0.18 95 / 0.35), transparent 40%), radial-gradient(circle at 85% 80%, oklch(0.58 0.23 27 / 0.25), transparent 40%)",
        }}
      />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10 sm:py-16">
        {/* Header / Logo */}
        <header className="mb-8 flex flex-col items-center text-center">
          <img
            src={duarteLogo}
            alt="Duarte Jr."
            className="h-20 w-auto drop-shadow-2xl sm:h-24"
          />
          <p className="mt-4 max-w-xl text-sm font-medium uppercase tracking-[0.2em] text-white/80 sm:text-base">
            Movimento Duarte • Cadastro Oficial
          </p>
          <h1 className="mt-2 max-w-2xl text-2xl font-bold text-white sm:text-4xl">
            Vamos juntos construir essa caminhada.
          </h1>
        </header>

        {/* Card do formulário */}
        <section className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-[var(--shadow-elegant)] ring-1 ring-black/5 sm:p-10">
          {success ? (
            <SuccessState onReset={() => setSuccess(false)} />
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                  Faça parte do movimento
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Preencha seus dados para receber novidades, convites para encontros e
                  mobilizações em sua região.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Nome */}
                <Field
                  id="nome"
                  label="Nome completo"
                  required
                  icon={<User className="size-4" />}
                >
                  <Input
                    id="nome"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder="Como você gostaria de ser chamado(a)"
                    value={form.nome}
                    onChange={(e) => update("nome", e.target.value)}
                    className="pl-10"
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Telefone */}
                  <Field
                    id="telefone"
                    label="Telefone / WhatsApp"
                    required
                    icon={<Phone className="size-4" />}
                  >
                    <Input
                      id="telefone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      placeholder="(00) 00000-0000"
                      value={form.telefone}
                      onChange={(e) => update("telefone", maskPhone(e.target.value))}
                      className="pl-10"
                    />
                  </Field>

                  {/* Email */}
                  <Field
                    id="email"
                    label="E-mail"
                    required
                    icon={<Mail className="size-4" />}
                  >
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={160}
                      placeholder="voce@exemplo.com"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className="pl-10"
                    />
                  </Field>
                </div>

                {/* Município com autocomplete */}
                <Field
                  id="municipio"
                  label="Município"
                  required
                  icon={<MapPin className="size-4" />}
                >
                  <Input
                    id="municipio"
                    type="text"
                    required
                    list="municipios-list"
                    autoComplete="off"
                    placeholder="Digite seu município"
                    value={form.municipio || form.municipioBusca}
                    onChange={(e) => {
                      update("municipio", e.target.value);
                      update("municipioBusca", e.target.value);
                    }}
                    className="pl-10"
                  />
                  <datalist id="municipios-list">
                    {MUNICIPIOS_MA.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  {sugestoes.length > 0 && form.municipioBusca && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {sugestoes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            update("municipio", s);
                            update("municipioBusca", "");
                          }}
                          className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition hover:bg-accent hover:text-accent-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>

                {/* Instagram */}
                <Field
                  id="instagram"
                  label="Instagram (opcional)"
                  icon={<Instagram className="size-4" />}
                >
                  <div className="relative">
                    <Input
                      id="instagram"
                      type="text"
                      maxLength={60}
                      placeholder="seu_usuario"
                      value={form.instagram}
                      onChange={(e) => update("instagram", e.target.value.replace(/^@+/, ""))}
                      className="pl-16"
                    />
                    <span className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      @
                    </span>
                  </div>
                </Field>

                {/* Observações */}
                <Field
                  id="observacoes"
                  label="Observação (opcional)"
                  icon={<MessageSquare className="size-4" />}
                  hideIconOnInput
                >
                  <Textarea
                    id="observacoes"
                    rows={4}
                    maxLength={500}
                    placeholder="Conte algo que você gostaria de compartilhar com a equipe..."
                    value={form.observacoes}
                    onChange={(e) => update("observacoes", e.target.value.slice(0, 500))}
                  />
                  <p
                    className={`mt-1 text-right text-xs ${
                      obsRestantes < 40 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {obsRestantes} caracteres restantes
                  </p>
                </Field>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full text-base font-semibold tracking-wide shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
                  style={{ background: "var(--gradient-hero)" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      Enviando cadastro...
                    </>
                  ) : (
                    "Quero fazer parte"
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Seus dados serão utilizados exclusivamente para comunicação da campanha.
                </p>
              </form>
            </>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-white/70">
          © {new Date().getFullYear()} Duarte Jr. • Todos os direitos reservados
        </footer>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  icon,
  children,
  hideIconOnInput,
}: {
  id: string;
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  hideIconOnInput?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        {icon && !hideIconOnInput && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div
        className="mb-5 flex size-20 items-center justify-center rounded-full"
        style={{ background: "var(--gradient-hero)" }}
      >
        <CheckCircle2 className="size-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
        Cadastro confirmado!
      </h2>
      <p className="mt-3 max-w-md text-muted-foreground">
        Obrigado por se juntar ao movimento. Em breve nossa equipe entrará em contato com
        novidades e convites para mobilizações na sua região.
      </p>
      <Button
        onClick={onReset}
        variant="outline"
        className="mt-6"
      >
        Fazer novo cadastro
      </Button>
    </div>
  );
}
