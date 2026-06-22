import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, LogOut, Search, Trash2, Lock, ArrowLeft, Users,
  MessageSquare, Eye, Pencil, Save, X, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-provider";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  adminLogin, adminListCadastros, adminDeleteCadastro,
  adminUpdateCadastro, adminGetFotoUrl,
} from "@/lib/admin.functions";
import { getWhatsappConfig, saveWhatsappConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administração — Cadastros Duarte" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

type Row = {
  id: string; criado_em: string; nome: string; telefone: string;
  email: string | null; municipio: string | null; instagram: string | null;
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
      <header className="border-b border-border bg-card">
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
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

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
    return rows.filter((r) => {
      if (n && !(r.nome ?? "").toLowerCase().includes(n)) return false;
      if (t && !(r.telefone ?? "").replace(/\D/g, "").includes(t)) return false;
      if (l) {
        const hay = [r.cidade_endereco, r.bairro, r.uf, r.endereco, r.cep, r.municipio]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(l)) return false;
      }
      if (s && !(r.instagram ?? "").toLowerCase().replace(/^@+/, "").includes(s)) return false;
      return true;
    });
  }, [rows, filterNome, filterTelefone, filterLocal, filterSocial]);

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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="size-6 text-primary" /> Cadastros
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length} de ${rows.length} registro(s)`}
          </p>
        </div>

        <form
          className="flex w-full max-w-xl items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); load(search); }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar no servidor (nome, e-mail, telefone, cidade, @instagram)..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>
      </div>

      <WhatsappConfigSection token={token} />

      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Filtrar por nome" value={filterNome} onChange={(e) => setFilterNome(e.target.value)} />
        <Input placeholder="Filtrar por telefone" value={filterTelefone} onChange={(e) => setFilterTelefone(e.target.value)} />
        <Input placeholder="Filtrar por localização (cidade, bairro, UF)" value={filterLocal} onChange={(e) => setFilterLocal(e.target.value)} />
        <Input placeholder="Filtrar por @instagram" value={filterSocial} onChange={(e) => setFilterSocial(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Localização</th>
                <th className="px-4 py-3">Instagram</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-6 animate-spin" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum cadastro encontrado.
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-border transition hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.criado_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.nome}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{r.telefone}</div>
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
              <span className="font-semibold text-foreground">{toDelete?.nome}</span>
              {toDelete?.email ? <> ({toDelete.email})</> : null} será removido permanentemente.
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

  const set = (k: keyof Row, v: string) => setForm((p) => (p ? { ...p, [k]: v } : p));

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
            email: form.email ?? "",
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
            <DetailField label="E-mail" editing={editing} value={form.email ?? ""} onChange={(v) => set("email", v)} />
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
    <section className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
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
