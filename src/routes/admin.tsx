import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, LogOut, Search, Trash2, Lock, ArrowLeft, Users,
  MessageSquare, Eye, Pencil, Save, X, ImageIcon,
  LayoutDashboard, Database, FileSpreadsheet, FileText, Upload, Download,
  Calendar, MapPin, TrendingUp, UserPlus, Filter, Mars, Venus,
  BarChart3, PieChart as PieIcon, LineChart as LineIcon, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-provider";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import {
  adminLogin, adminListCadastros, adminDeleteCadastro,
  adminUpdateCadastro, adminGetFotoUrl, adminBulkInsert, adminBulkDelete,
} from "@/lib/admin.functions";
import { getWhatsappConfig, saveWhatsappConfig } from "@/lib/config.functions";

/* Brand palette — Azul Marinho, Amarelo, Vermelho, Azul Claro */
const BRAND = {
  navy: "#0a2540",
  yellow: "#facc15",
  red: "#dc2626",
  sky: "#38bdf8",
};
const BAIRRO_PALETTE = [
  BRAND.navy, BRAND.yellow, BRAND.red, BRAND.sky,
  "#1e3a8a", "#f59e0b", "#ef4444", "#0ea5e9",
  "#1d4ed8", "#fbbf24", "#b91c1c", "#7dd3fc",
];

function formatPhoneDisplay(v: string | null | undefined) {
  if (!v) return "";
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
}

type DrillKind = "today" | "last7" | "last30" | "bairro" | "cidade" | "sexo";
type DrillFilter = { kind: DrillKind; label: string; value?: string } | null;

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo — Duarte Jr." },
      { name: "description", content: "Painel administrativo interno para gerenciamento de cadastros do movimento Duarte Jr." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Painel Administrativo — Duarte Jr." },
      { property: "og:description", content: "Painel administrativo interno para gerenciamento de cadastros." },
      { property: "og:url", content: "https://duarte-cadastro-facil.lovable.app/admin" },
    ],
    links: [{ rel: "canonical", href: "https://duarte-cadastro-facil.lovable.app/admin" }],
  }),
  component: AdminPage,
});

type Row = {
  id: string; criado_em: string; nome: string; telefone: string;
  email: string | null; cargo: string | null; sexo: "M" | "F" | null;
  municipio: string | null; instagram: string | null;
  observacoes: string | null; cep: string | null; endereco: string | null;
  bairro: string | null; cidade_endereco: string | null; uf: string | null;
  foto_url: string | null;
};

const STORAGE_KEY = "duarte_admin_token";

type StoredSession = { token: string; exp: number };

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed.exp || parsed.exp * 1000 < Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function AdminPage() {
  const [password, setPassword] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("duarte_admin_pwd");
    const s = readSession();
    if (s) setToken(s.token);
  }, []);

  const loginFn = useServerFn(adminLogin);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await loginFn({ data: { password } });
      const exp = Math.floor(Date.now() / 1000) + (res.expiresIn ?? 3600);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.token, exp }));
      setToken(res.token);
      setPassword("");
      toast.success("Acesso liberado.");
    } catch (err) {
      console.error(err);
      toast.error("Senha incorreta.");
      setPassword("");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setPassword("");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Voltar ao site
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="bg-muted text-foreground hover:bg-muted/70" />
            {token && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 size-4" /> Sair
              </Button>
            )}
          </div>
        </div>
      </header>

      {!token ? (
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full" style={{ background: "var(--gradient-hero)" }}>
            <Lock className="size-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Área administrativa</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Informe a senha de acesso para visualizar os cadastros.
          </p>
          <form onSubmit={handleLogin} className="mt-6 w-full space-y-4">
            <div>
              <Label htmlFor="pwd">Senha</Label>
              <Input id="pwd" type="password" autoFocus required
                value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
            <Button type="submit" disabled={loggingIn || !password}
              className="h-11 w-full text-white" style={{ background: "var(--gradient-hero)" }}>
              {loggingIn ? <><Loader2 className="mr-2 size-4 animate-spin" /> Entrando...</> : "Entrar"}
            </Button>
          </form>
        </div>
      ) : (
        <AdminDashboard token={token} onAuthFail={handleLogout} />
      )}
    </div>
  );
}

function AdminDashboard({ token, onAuthFail }: { token: string; onAuthFail: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterNome, setFilterNome] = useState("");
  const [filterTelefone, setFilterTelefone] = useState("");
  const [filterLocal, setFilterLocal] = useState("");
  const [filterSocial, setFilterSocial] = useState("");
  const [filterSexo, setFilterSexo] = useState<"" | "M" | "F">("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [drillFilter, setDrillFilter] = useState<DrillFilter>(null);

  const router = useRouter();
  const listFn = useServerFn(adminListCadastros);
  const delFn = useServerFn(adminDeleteCadastro);

  async function load(searchTerm = "") {
    setLoading(true);
    try {
      const { rows } = await listFn({ data: { token, search: searchTerm || undefined } });
      setRows(rows as Row[]);
    } catch (err) {
      console.error(err);
      toast.error("Sessão expirada. Faça login novamente.");
      onAuthFail();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(""); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const n = filterNome.trim().toLowerCase();
    const t = filterTelefone.replace(/\D/g, "");
    const l = filterLocal.trim().toLowerCase();
    const s = filterSocial.trim().toLowerCase().replace(/^@+/, "");
    const de = dataDe ? new Date(dataDe + "T00:00:00").getTime() : null;
    const ate = dataAte ? new Date(dataAte + "T23:59:59").getTime() : null;
    return rows.filter((r) => {
      if (n && !(r.nome ?? "").toLowerCase().includes(n)) return false;
      if (t && !(r.telefone ?? "").replace(/\D/g, "").includes(t)) return false;
      if (l) {
        const hay = [r.cidade_endereco, r.bairro, r.uf, r.endereco, r.cep, r.municipio]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(l)) return false;
      }
      if (s && !(r.instagram ?? "").toLowerCase().replace(/^@+/, "").includes(s)) return false;
      if (filterSexo && r.sexo !== filterSexo) return false;
      if (de || ate) {
        const ts = new Date(r.criado_em).getTime();
        if (de && ts < de) return false;
        if (ate && ts > ate) return false;
      }
      return true;
    });
  }, [rows, filterNome, filterTelefone, filterLocal, filterSocial, filterSexo, dataDe, dataAte]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await delFn({ data: { token, id: toDelete.id } });
      setRows((p) => p.filter((r) => r.id !== toDelete.id));
      toast.success("Cadastro excluído.");
      setToDelete(null);
      router.invalidate();
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível excluir. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  function handleUpdated(updated: Row) {
    setRows((p) => p.map((r) => (r.id === updated.id ? updated : r)));
    setSelected(updated);
  }

  function clearFilters() {
    setFilterNome(""); setFilterTelefone(""); setFilterLocal("");
    setFilterSocial(""); setFilterSexo(""); setDataDe(""); setDataAte("");
    setDrillFilter(null);
  }

  function ymd(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function handleDrill(kind: DrillKind, value?: string) {
    // clear existing local filters first
    setFilterNome(""); setFilterTelefone(""); setFilterLocal("");
    setFilterSocial(""); setFilterSexo(""); setDataDe(""); setDataAte("");

    const today = new Date();
    if (kind === "today") {
      const t = ymd(today);
      setDataDe(t); setDataAte(t);
      setDrillFilter({ kind, label: "Cadastrados hoje" });
    } else if (kind === "last7") {
      const start = new Date(today); start.setDate(start.getDate() - 6);
      setDataDe(ymd(start)); setDataAte(ymd(today));
      setDrillFilter({ kind, label: "Últimos 7 dias" });
    } else if (kind === "last30") {
      const start = new Date(today); start.setDate(start.getDate() - 29);
      setDataDe(ymd(start)); setDataAte(ymd(today));
      setDrillFilter({ kind, label: "Últimos 30 dias" });
    } else if (kind === "bairro" && value) {
      setFilterLocal(value);
      setDrillFilter({ kind, label: `Bairro: ${value}`, value });
    } else if (kind === "cidade" && value) {
      setFilterLocal(value);
      setDrillFilter({ kind, label: `Cidade: ${value}`, value });
    } else if (kind === "sexo" && (value === "M" || value === "F")) {
      setFilterSexo(value);
      setDrillFilter({ kind, label: value === "M" ? "Sexo: Masculino" : "Sexo: Feminino", value });
    }
    setTab("cadastros");
  }

  function exportCsv() {
    const cols: { key: keyof Row; label: string }[] = [
      { key: "criado_em", label: "Data" },
      { key: "nome", label: "Nome" },
      { key: "cargo", label: "Cargo" },
      { key: "sexo", label: "Sexo" },
      { key: "telefone", label: "Telefone" },
      { key: "email", label: "Email" },
      { key: "instagram", label: "Instagram" },
      { key: "cep", label: "CEP" },
      { key: "endereco", label: "Endereço" },
      { key: "bairro", label: "Bairro" },
      { key: "cidade_endereco", label: "Cidade" },
      { key: "uf", label: "UF" },
      { key: "observacoes", label: "Observações" },
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.map((c) => escape(c.label)).join(";")];
    filtered.forEach((r) => {
      lines.push(cols.map((c) => {
        let v: unknown = r[c.key];
        if (c.key === "criado_em" && v) v = new Date(v as string).toLocaleString("pt-BR");
        if (c.key === "telefone") v = formatPhoneDisplay(v as string);
        return escape(v ?? "");
      }).join(";"));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cadastros-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado (${filtered.length} registro(s)).`);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="size-6 text-primary" /> CRM Duarte 700
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${rows.length} cadastro(s) no total`}
          </p>
        </div>
        <form
          className="flex w-full max-w-xl flex-wrap items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); load(search); }}
        >
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Pesquisa rápida por nome, telefone, cidade ou @instagram"
              placeholder="Pesquisa rápida (nome, telefone, cidade, @instagram)..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv} title="Exportar dados filtrados para CSV">
            <Download className="mr-1 size-4" /> CSV
          </Button>
        </form>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 size-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="cadastros"><Database className="mr-2 size-4" />Cadastros</TabsTrigger>
          <TabsTrigger value="io"><FileSpreadsheet className="mr-2 size-4" />Import/Export</TabsTrigger>
          <TabsTrigger value="config"><MessageSquare className="mr-2 size-4" />WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab rows={rows} loading={loading} onDrill={handleDrill} />
        </TabsContent>

        <TabsContent value="cadastros" className="mt-6">
          {drillFilter && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Filter className="size-4 text-primary" />
                Filtro ativo: <span className="font-semibold">{drillFilter.label}</span>
              </div>
              <Button size="sm" variant="outline" onClick={clearFilters}>
                <X className="mr-1 size-3" /> Limpar filtro
              </Button>
            </div>
          )}
          <FiltersBar
            filterNome={filterNome} setFilterNome={setFilterNome}
            filterTelefone={filterTelefone} setFilterTelefone={setFilterTelefone}
            filterLocal={filterLocal} setFilterLocal={setFilterLocal}
            filterSocial={filterSocial} setFilterSocial={setFilterSocial}
            filterSexo={filterSexo} setFilterSexo={setFilterSexo}
            dataDe={dataDe} setDataDe={setDataDe}
            dataAte={dataAte} setDataAte={setDataAte}
            onClear={clearFilters}
          />
          <p className="mb-2 text-xs text-muted-foreground">
            {filtered.length} de {rows.length} registro(s) exibidos
          </p>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Sexo</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Localização</th>
                    <th className="px-4 py-3">Instagram</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-6 animate-spin" />
                    </td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhum cadastro encontrado.
                    </td></tr>
                  ) : filtered.map((r) => (
                    <tr key={r.id} className="cursor-pointer border-t border-border transition hover:bg-muted/30" onClick={() => setSelected(r)}>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.criado_em).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.nome}</td>
                      <td className="px-4 py-3 text-xs">{r.cargo ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{r.sexo === "M" ? "Masc." : r.sexo === "F" ? "Fem." : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs">{formatPhoneDisplay(r.telefone)}</div>
                        {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {(r.cidade_endereco || r.uf) && (
                          <div>{[r.cidade_endereco, r.uf].filter(Boolean).join("/")}</div>
                        )}
                        {r.bairro && <div className="text-muted-foreground">{r.bairro}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">{r.instagram ?? "—"}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => setSelected(r)} aria-label="Ver detalhes">
                          <Eye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(r)}
                          aria-label="Excluir cadastro" className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="io" className="mt-6">
          <ImportExportTab token={token} rows={filtered} allRows={rows} onReload={() => load("")} />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <WhatsappConfigSection token={token} />
        </TabsContent>
      </Tabs>

      <CadastroDetailDialog
        token={token}
        row={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
        onDelete={(r) => { setSelected(null); setToDelete(r); }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cadastro de{" "}
              <span className="font-semibold text-foreground">{toDelete?.nome}</span>{" "}
              será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Excluindo...</> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

/* -------------------- Filters Bar -------------------- */

function FiltersBar(props: {
  filterNome: string; setFilterNome: (v: string) => void;
  filterTelefone: string; setFilterTelefone: (v: string) => void;
  filterLocal: string; setFilterLocal: (v: string) => void;
  filterSocial: string; setFilterSocial: (v: string) => void;
  filterSexo: "" | "M" | "F"; setFilterSexo: (v: "" | "M" | "F") => void;
  dataDe: string; setDataDe: (v: string) => void;
  dataAte: string; setDataAte: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={props.onClear}>Limpar</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input aria-label="Filtrar por nome" placeholder="Nome" value={props.filterNome} onChange={(e) => props.setFilterNome(e.target.value)} />
        <Input aria-label="Filtrar por telefone" placeholder="Telefone" value={props.filterTelefone} onChange={(e) => props.setFilterTelefone(e.target.value)} />
        <Input aria-label="Filtrar por localização (cidade, bairro, UF)" placeholder="Localização (cidade, bairro, UF)" value={props.filterLocal} onChange={(e) => props.setFilterLocal(e.target.value)} />
        <Input aria-label="Filtrar por @instagram" placeholder="@instagram" value={props.filterSocial} onChange={(e) => props.setFilterSocial(e.target.value)} />
        <div>
          <Label htmlFor="filter-sexo" className="text-xs text-muted-foreground">Sexo</Label>
          <select
            id="filter-sexo"
            value={props.filterSexo}
            onChange={(e) => props.setFilterSexo(e.target.value as "" | "M" | "F")}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
        <div>
          <Label htmlFor="filter-data-de" className="text-xs text-muted-foreground">Cadastrado de</Label>
          <Input id="filter-data-de" type="date" value={props.dataDe} onChange={(e) => props.setDataDe(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="filter-data-ate" className="text-xs text-muted-foreground">Cadastrado até</Label>
          <Input id="filter-data-ate" type="date" value={props.dataAte} onChange={(e) => props.setDataAte(e.target.value)} className="mt-1" />
        </div>
      </div>
    </section>
  );
}

/* -------------------- Dashboard Tab -------------------- */

function DashboardTab({ rows, loading, onDrill }: {
  rows: Row[]; loading: boolean;
  onDrill: (kind: DrillKind, value?: string) => void;
}) {
  const stats = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const start7 = startToday - 6 * 86400000;
    const start30 = startToday - 29 * 86400000;

    let today = 0, last7 = 0, last30 = 0;
    const bairroMap = new Map<string, number>();
    const sexoMap = { M: 0, F: 0, "—": 0 };
    const dailyMap = new Map<string, number>();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(startToday - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }

    rows.forEach((r) => {
      const ts = new Date(r.criado_em).getTime();
      if (ts >= startToday) today++;
      if (ts >= start7) last7++;
      if (ts >= start30) last30++;

      const key = new Date(r.criado_em).toISOString().slice(0, 10);
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);

      if (r.bairro) bairroMap.set(r.bairro, (bairroMap.get(r.bairro) ?? 0) + 1);
      const sx = (r.sexo as "M" | "F" | null) ?? "—";
      sexoMap[sx]++;
    });

    const dailySeries = Array.from(dailyMap.entries()).map(([date, total]) => ({ date: date.slice(5), total }));
    const bairros = Array.from(bairroMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }));

    return {
      today, last7, last30, dailySeries, bairros,
      total: rows.length, sexoM: sexoMap.M, sexoF: sexoMap.F,
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Carregando métricas...
      </div>
    );
  }

  type CardSpec = {
    label: string; value: number; icon: React.ReactNode;
    gradient: string; ring: string; onClick?: () => void;
  };
  const cards: CardSpec[] = [
    {
      label: "Total de cadastros", value: stats.total,
      icon: <Users className="size-6" />,
      gradient: "from-[#0a2540] via-[#1e3a8a] to-[#1d4ed8]",
      ring: "ring-blue-300/40",
    },
    {
      label: "Cadastrados hoje", value: stats.today,
      icon: <UserPlus className="size-6" />,
      gradient: "from-[#facc15] via-[#f59e0b] to-[#ef4444]",
      ring: "ring-amber-300/50",
      onClick: () => onDrill("today"),
    },
    {
      label: "Últimos 7 dias", value: stats.last7,
      icon: <Calendar className="size-6" />,
      gradient: "from-[#38bdf8] via-[#0ea5e9] to-[#1d4ed8]",
      ring: "ring-sky-300/50",
      onClick: () => onDrill("last7"),
    },
    {
      label: "Últimos 30 dias", value: stats.last30,
      icon: <TrendingUp className="size-6" />,
      gradient: "from-[#dc2626] via-[#b91c1c] to-[#0a2540]",
      ring: "ring-red-300/50",
      onClick: () => onDrill("last30"),
    },
    {
      label: "Masculino", value: stats.sexoM,
      icon: <Mars className="size-6" />,
      gradient: "from-[#0a2540] via-[#1d4ed8] to-[#38bdf8]",
      ring: "ring-blue-300/50",
      onClick: () => onDrill("sexo", "M"),
    },
    {
      label: "Feminino", value: stats.sexoF,
      icon: <Venus className="size-6" />,
      gradient: "from-[#facc15] via-[#dc2626] to-[#0a2540]",
      ring: "ring-yellow-300/50",
      onClick: () => onDrill("sexo", "F"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Métricas — clique em um card para filtrar a lista
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((c, i) => <MetricCard key={i} {...c} />)}
        </div>
      </div>

      <BairrosChartSection bairros={stats.bairros} onDrill={onDrill} />

      <StrategicIntelligence bairros={stats.bairros} />

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Cadastros nos últimos 14 dias</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailySeries}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill={BRAND.sky} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, gradient, ring, onClick }: {
  icon: React.ReactNode; label: string; value: number;
  gradient: string; ring: string; onClick?: () => void;
}) {
  const interactive = !!onClick;
  const Comp: "button" | "div" = interactive ? "button" : "div";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={`group relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-left text-white shadow-lg ring-1 ${ring} transition-transform ${interactive ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]" : ""}`}
    >
      <div aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/90">{label}</span>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur">
          {icon}
        </span>
      </div>
      <p className="relative mt-3 text-4xl font-extrabold tabular-nums drop-shadow-sm">{value}</p>
      {interactive && (
        <p className="relative mt-1 text-[11px] font-medium uppercase tracking-wider text-white/85">
          Clique para filtrar →
        </p>
      )}
    </Comp>
  );
}

/* -------------------- Bairros chart with Bar / Pie / Line toggle -------------------- */

function BairrosChartSection({ bairros, onDrill }: {
  bairros: { name: string; total: number }[];
  onDrill: (kind: DrillKind, value?: string) => void;
}) {
  const [mode, setMode] = useState<"bar" | "pie" | "line">("bar");
  const data = bairros.slice(0, 12);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <MapPin className="size-5 text-primary" /> Distribuição por bairro
          </h3>
          <p className="text-xs text-muted-foreground">Top {data.length} bairros — clique para filtrar a lista.</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          {([
            { v: "bar", label: "Barras", Icon: BarChart3 },
            { v: "pie", label: "Pizza", Icon: PieIcon },
            { v: "line", label: "Linhas", Icon: LineIcon },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setMode(v)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${mode === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Sem dados de bairro ainda.</p>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "bar" ? (
              <BarChart
                data={data} layout="vertical" margin={{ left: 8 }}
                onClick={(e) => {
                  const name = (e?.activePayload?.[0]?.payload as { name?: string } | undefined)?.name;
                  if (name) onDrill("bairro", name);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} className="cursor-pointer">
                  {data.map((_, i) => (
                    <Cell key={i} fill={BAIRRO_PALETTE[i % BAIRRO_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : mode === "pie" ? (
              <PieChart>
                <Pie
                  data={data} dataKey="total" nameKey="name" cx="50%" cy="50%"
                  outerRadius={110} label={(e: { name?: string }) => e?.name ?? ""}
                  onClick={(e: { name?: string }) => e?.name && onDrill("bairro", e.name)}
                  className="cursor-pointer"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={BAIRRO_PALETTE[i % BAIRRO_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone" dataKey="total" stroke={BRAND.red} strokeWidth={3}
                  dot={{ fill: BRAND.yellow, stroke: BRAND.navy, strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: BRAND.sky }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/* -------------------- Strategic Intelligence widget -------------------- */

function StrategicIntelligence({ bairros }: { bairros: { name: string; total: number }[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => bairros.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase())),
    [bairros, query],
  );

  function toggle(name: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  }

  const picked = bairros.filter((b) => selected.has(b.name));
  const sum = picked.reduce((s, b) => s + b.total, 0);
  const shares = picked.map((b) => ({
    name: b.name, total: b.total,
    pct: sum > 0 ? Math.round((b.total / sum) * 1000) / 10 : 0,
  })).sort((a, b) => b.total - a.total);

  const insight = useMemo(() => {
    if (picked.length < 2) return null;
    const top = shares[0];
    const bottom = shares[shares.length - 1];
    const names = shares.map((s) => s.name).join(" + ");
    const breakdown = shares.map((s) => `${s.name} ${s.pct}%`).join(", ");
    const gap = top.pct - bottom.pct;
    let action = "";
    if (gap >= 20) {
      action = `Priorizar ação de rua e disparos de WhatsApp focados em propostas de infraestrutura em ${bottom.name} para equilibrar a base do candidato em relação a ${top.name}.`;
    } else if (gap >= 8) {
      action = `${top.name} lidera com folga moderada; reforçar presença em ${bottom.name} com lives, panfletagem e contatos diretos para nivelar a base.`;
    } else {
      action = `Distribuição equilibrada entre ${names}. Sustentar a frequência atual e ampliar para bairros vizinhos com menor cobertura.`;
    }
    return `Os bairros selecionados (${names}) somam ${sum} cadastros. ${breakdown}. Sugestão de Ação: ${action}`;
  }, [picked.length, shares, sum]);

  return (
    <section className="rounded-2xl border-2 border-yellow-400/40 bg-gradient-to-br from-[#0a2540] via-[#0a2540] to-[#1d4ed8] p-5 text-white shadow-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-5 text-yellow-300" /> Inteligência Estratégica de Bairros
          </h3>
          <p className="text-xs text-white/75">
            Combine dois ou mais bairros para gerar um insight de ação automatizado.
          </p>
        </div>
        {selected.size > 0 && (
          <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setSelected(new Set())}>
            <X className="mr-1 size-3" /> Limpar seleção
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
          <Input
            placeholder="Buscar bairro..." value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2 border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/70">Nenhum bairro encontrado.</p>
            ) : filtered.map((b) => {
              const checked = selected.has(b.name);
              return (
                <label key={b.name}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition ${checked ? "bg-yellow-400/20 ring-1 ring-yellow-300/60" : "hover:bg-white/10"}`}>
                  <span className="flex items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(b.name)}
                      className="border-white/60 data-[state=checked]:border-yellow-300 data-[state=checked]:bg-yellow-300 data-[state=checked]:text-[#0a2540]"
                    />
                    <span className="font-medium text-white">{b.name}</span>
                  </span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">{b.total}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
          {picked.length === 0 ? (
            <p className="flex h-full items-center justify-center text-center text-sm text-white/75">
              Selecione pelo menos 2 bairros à esquerda para ver o somatório e o insight de ação.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-yellow-300 tabular-nums">{sum}</span>
                <span className="text-sm text-white/80">cadastros somados em {picked.length} bairro(s)</span>
              </div>
              <ul className="mb-4 space-y-2">
                {shares.map((s, i) => (
                  <li key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-white">{s.name}</span>
                      <span className="text-white/80">{s.total} · <strong className="text-yellow-300">{s.pct}%</strong></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${s.pct}%`,
                          background: BAIRRO_PALETTE[i % BAIRRO_PALETTE.length],
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {insight && picked.length >= 2 && (
                <div className="rounded-lg border border-yellow-300/40 bg-yellow-300/10 p-3 text-sm leading-relaxed text-white">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-300">
                    <Sparkles className="size-3.5" /> Insight de Ação
                  </div>
                  {insight}
                </div>
              )}
              {picked.length === 1 && (
                <p className="text-center text-xs text-white/70">Adicione mais um bairro para gerar a análise comparativa.</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}



const EXPORT_COLS: { key: keyof Row; label: string }[] = [
  { key: "criado_em", label: "Data" },
  { key: "nome", label: "Nome" },
  { key: "cargo", label: "Cargo" },
  { key: "sexo", label: "Sexo" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "Email" },
  { key: "instagram", label: "Instagram" },
  { key: "cep", label: "CEP" },
  { key: "endereco", label: "Endereço" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade_endereco", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "observacoes", label: "Observações" },
];

function ImportExportTab({ token, rows, allRows, onReload }: {
  token: string; rows: Row[]; allRows: Row[]; onReload: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [lastImport, setLastImport] = useState<{ ids: string[]; at: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("admin_last_import");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const bulkFn = useServerFn(adminBulkInsert);
  const undoFn = useServerFn(adminBulkDelete);

  function persistLastImport(v: { ids: string[]; at: string } | null) {
    setLastImport(v);
    try {
      if (v) window.localStorage.setItem("admin_last_import", JSON.stringify(v));
      else window.localStorage.removeItem("admin_last_import");
    } catch { /* ignore */ }
  }

  async function handleUndoImport() {
    if (!lastImport || lastImport.ids.length === 0) return;
    if (!window.confirm(`Remover ${lastImport.ids.length} cadastro(s) da última importação? Esta ação não pode ser desfeita.`)) return;
    setUndoing(true);
    try {
      const res = await undoFn({ data: { token, ids: lastImport.ids } });
      toast.success(`${res.deleted} cadastro(s) removido(s).`);
      persistLastImport(null);
      onReload();
    } catch (err) {
      console.error(err);
      toast.error("Falha ao desfazer a importação.");
    } finally {
      setUndoing(false);
    }
  }


  function buildExportRows(source: Row[]) {
    return source.map((r) => {
      const obj: Record<string, string> = {};
      EXPORT_COLS.forEach((c) => {
        let v: unknown = r[c.key];
        if (c.key === "criado_em" && v) v = new Date(v as string).toLocaleString("pt-BR");
        obj[c.label] = (v ?? "") as string;
      });
      return obj;
    });
  }

  async function exportExcel(source: Row[], filename: string) {
    const XLSX = await import("xlsx");
    const data = buildExportRows(source);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cadastros");
    XLSX.writeFile(wb, filename);
    toast.success(`Exportado ${data.length} registro(s).`);
  }

  async function exportPdf(source: Row[], filename: string) {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("Cadastros Duarte 700", 40, 40);
    doc.setFontSize(10);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} — ${source.length} registro(s)`, 40, 58);
    const head = [EXPORT_COLS.map((c) => c.label)];
    const body = source.map((r) =>
      EXPORT_COLS.map((c) => {
        let v: unknown = r[c.key];
        if (c.key === "criado_em" && v) v = new Date(v as string).toLocaleString("pt-BR");
        return String(v ?? "");
      }),
    );
    autoTable(doc, { head, body, startY: 72, styles: { fontSize: 7, cellPadding: 3 }, headStyles: { fillColor: [30, 64, 175] } });
    doc.save(filename);
    toast.success(`PDF gerado com ${source.length} registro(s).`);
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const sample = [{
      nome: "João da Silva", telefone: "98999990000", cargo: "Comerciante", sexo: "M",
      email: "joao@email.com", instagram: "@joaosilva",
      cep: "65000-000", endereco: "Rua A, 123", bairro: "Centro",
      cidade_endereco: "São Luís", uf: "MA", observacoes: "",
    }];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo-importacao.xlsx");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const norm = raw.map((r) => {
        const get = (...ks: string[]) => {
          for (const k of ks) {
            for (const key of Object.keys(r)) {
              if (key.toLowerCase().trim() === k.toLowerCase()) {
                const v = r[key];
                return v == null ? "" : String(v).trim();
              }
            }
          }
          return "";
        };
        const sexoRaw = get("sexo").toUpperCase().charAt(0);
        const sexo = sexoRaw === "M" || sexoRaw === "F" ? sexoRaw : undefined;
        return {
          nome: get("nome", "name"),
          telefone: get("telefone", "phone", "whatsapp"),
          cargo: get("cargo", "profissao", "profissão") || undefined,
          sexo,
          email: get("email", "e-mail") || undefined,
          instagram: get("instagram", "@") || undefined,
          cep: get("cep") || undefined,
          endereco: get("endereco", "endereço", "rua") || undefined,
          bairro: get("bairro") || undefined,
          cidade_endereco: get("cidade", "cidade_endereco", "municipio", "município") || undefined,
          uf: get("uf", "estado") || undefined,
          observacoes: get("observacoes", "observação", "obs") || undefined,
        };
      }).filter((r) => r.nome && r.telefone);

      if (norm.length === 0) {
        toast.error("Nenhuma linha válida encontrada. Verifique se há colunas nome e telefone.");
        return;
      }

      const res = await bulkFn({ data: { token, rows: norm } });
      toast.success(`${res.inserted} cadastro(s) importado(s).`);
      onReload();
    } catch (err) {
      console.error(err);
      toast.error("Falha ao importar. Verifique o arquivo.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
          <Download className="size-5 text-primary" /> Exportar dados
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Os filtros aplicados na aba <strong>Cadastros</strong> serão respeitados.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={() => exportExcel(rows, "cadastros-filtrados.xlsx")} className="w-full">
            <FileSpreadsheet className="mr-2 size-4" /> Excel (filtrados: {rows.length})
          </Button>
          <Button onClick={() => exportPdf(rows, "cadastros-filtrados.pdf")} variant="outline" className="w-full">
            <FileText className="mr-2 size-4" /> PDF (filtrados: {rows.length})
          </Button>
          <Button onClick={() => exportExcel(allRows, "cadastros-todos.xlsx")} variant="secondary" className="w-full">
            <FileSpreadsheet className="mr-2 size-4" /> Excel (todos: {allRows.length})
          </Button>
          <Button onClick={() => exportPdf(allRows, "cadastros-todos.pdf")} variant="secondary" className="w-full">
            <FileText className="mr-2 size-4" /> PDF (todos: {allRows.length})
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
          <Upload className="size-5 text-primary" /> Importar dados
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Envie uma planilha <code>.xlsx</code> ou <code>.csv</code> contendo as colunas <strong>nome</strong> e <strong>telefone</strong> (obrigatórias).
          Demais colunas suportadas: cargo, sexo, email, instagram, cep, endereco, bairro, cidade, uf, observacoes.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="mr-2 size-4" /> Baixar modelo
          </Button>
          <Button onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <><Loader2 className="mr-2 size-4 animate-spin" /> Importando...</> : <><Upload className="mr-2 size-4" /> Escolher arquivo</>}
          </Button>
          <input
            ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={handleImport}
          />
        </div>
      </section>
    </div>
  );
}

/* -------------------- Detail Dialog -------------------- */

function CadastroDetailDialog({
  token, row, onClose, onUpdated, onDelete,
}: {
  token: string;
  row: Row | null;
  onClose: () => void;
  onUpdated: (r: Row) => void;
  onDelete: (r: Row) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Row | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoLoading, setFotoLoading] = useState(false);
  const updateFn = useServerFn(adminUpdateCadastro);
  const fotoFn = useServerFn(adminGetFotoUrl);

  useEffect(() => {
    setEditing(false);
    setForm(row);
    setFotoUrl(null);
    if (row?.foto_url) {
      setFotoLoading(true);
      fotoFn({ data: { token, path: row.foto_url } })
        .then((r) => setFotoUrl(r.url))
        .catch(() => setFotoUrl(null))
        .finally(() => setFotoLoading(false));
    }
  }, [row, token, fotoFn]);

  if (!row || !form) return null;

  const set = (k: keyof Row, v: string) => setForm((p) => (p ? { ...p, [k]: v } as Row : p));

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const { row: updated } = await updateFn({
        data: {
          token, id: form.id,
          patch: {
            nome: form.nome,
            telefone: form.telefone,
            cargo: form.cargo ?? "",
            sexo: form.sexo ?? null,
            instagram: form.instagram ?? "",
            observacoes: form.observacoes ?? "",
            cep: form.cep ?? "",
            endereco: form.endereco ?? "",
            bairro: form.bairro ?? "",
            cidade_endereco: form.cidade_endereco ?? "",
            uf: form.uf ?? "",
          },
        },
      });
      toast.success("Cadastro atualizado.");
      onUpdated(updated as Row);
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cadastro" : "Detalhes do cadastro"}</DialogTitle>
          <DialogDescription>
            Cadastrado em {new Date(row.criado_em).toLocaleString("pt-BR")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-36 items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {fotoLoading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : fotoUrl ? (
                <img src={fotoUrl} alt={`Foto de ${row.nome}`} className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            {fotoUrl && (
              <a href={fotoUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary underline-offset-2 hover:underline">
                Abrir foto
              </a>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Nome" editing={editing} value={form.nome} onChange={(v) => set("nome", v)} />
            <DetailField label="Telefone" editing={editing} value={form.telefone} onChange={(v) => set("telefone", v)} />
            <DetailField label="Cargo / Profissão" editing={editing} value={form.cargo ?? ""} onChange={(v) => set("cargo", v)} />
            <div>
              <Label className="text-xs text-muted-foreground">Sexo</Label>
              {editing ? (
                <select
                  value={form.sexo ?? ""}
                  onChange={(e) => setForm((p) => (p ? { ...p, sexo: (e.target.value || null) as "M" | "F" | null } : p))}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              ) : (
                <p className="mt-1 rounded-md border bg-muted/30 p-2 text-sm">
                  {form.sexo === "M" ? "Masculino" : form.sexo === "F" ? "Feminino" : <span className="text-muted-foreground">—</span>}
                </p>
              )}
            </div>
            <DetailField label="E-mail" editing={false} value={form.email ?? ""} onChange={() => {}} />
            <DetailField label="Instagram" editing={editing} value={form.instagram ?? ""} onChange={(v) => set("instagram", v)} />
            <DetailField label="CEP" editing={editing} value={form.cep ?? ""} onChange={(v) => set("cep", v)} />
            <DetailField label="Endereço" editing={editing} value={form.endereco ?? ""} onChange={(v) => set("endereco", v)} />
            <DetailField label="Bairro" editing={editing} value={form.bairro ?? ""} onChange={(v) => set("bairro", v)} />
            <DetailField label="Cidade" editing={editing} value={form.cidade_endereco ?? ""} onChange={(v) => set("cidade_endereco", v)} />
            <DetailField label="UF" editing={editing} value={form.uf ?? ""} onChange={(v) => set("uf", v.toUpperCase())} />
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Observação</Label>
              {editing ? (
                <Textarea rows={3} value={form.observacoes ?? ""}
                  onChange={(e) => set("observacoes", e.target.value)} className="mt-1" />
              ) : (
                <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-sm">
                  {row.observacoes || <span className="text-muted-foreground">—</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" className="text-destructive" onClick={() => onDelete(row)}>
            <Trash2 className="mr-2 size-4" /> Excluir
          </Button>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="ghost" onClick={() => { setForm(row); setEditing(false); }} disabled={saving}>
                  <X className="mr-2 size-4" /> Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</> : <><Save className="mr-2 size-4" /> Salvar</>}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>Fechar</Button>
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 size-4" /> Editar
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, value, editing, onChange }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      ) : (
        <p className="mt-1 rounded-md border bg-muted/30 p-2 text-sm">
          {value || <span className="text-muted-foreground">—</span>}
        </p>
      )}
    </div>
  );
}

/* -------------------- WhatsApp Config -------------------- */

function WhatsappConfigSection({ token }: { token: string }) {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const getCfg = useServerFn(getWhatsappConfig);
  const saveCfg = useServerFn(saveWhatsappConfig);

  useEffect(() => {
    getCfg()
      .then((c) => { setNumber(c.number); setMessage(c.message); })
      .catch(() => toast.error("Não foi possível carregar a configuração do WhatsApp."))
      .finally(() => setLoading(false));
  }, [getCfg]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const digits = number.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Informe o número com DDI + DDD (ex: 5598999999999).");
    setSaving(true);
    try {
      await saveCfg({ data: { token, number: digits, message } });
      setNumber(digits);
      toast.success("Configuração do WhatsApp salva.");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="size-5 text-primary" />
        <h2 className="text-base font-semibold">Configuração do WhatsApp (QR code pós-cadastro)</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Defina o número que receberá os contatos e a mensagem pré-preenchida exibida ao final do cadastro.
      </p>
      <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <div>
          <Label htmlFor="wa-number">Número (DDI + DDD + número)</Label>
          <Input
            id="wa-number" placeholder="5598999999999" inputMode="numeric"
            value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
            disabled={loading || saving} maxLength={15} className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">Apenas dígitos. Ex.: 55 + 98 + número.</p>
        </div>
        <div>
          <Label htmlFor="wa-message">Mensagem pré-preenchida</Label>
          <Textarea
            id="wa-message" rows={3} maxLength={500}
            value={message} onChange={(e) => setMessage(e.target.value)}
            disabled={loading || saving} className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading || saving}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</> : "Salvar configuração"}
          </Button>
        </div>
      </form>
    </section>
  );
}
