import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, Search, Trash2, Lock, ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-provider";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminLogin, adminListCadastros, adminDeleteCadastro } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administração — Cadastros Duarte" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

type Row = {
  id: string; criado_em: string; nome: string; telefone: string;
  email: string; municipio: string; instagram: string | null;
  observacoes: string | null; cep: string | null; endereco: string | null;
  bairro: string | null; cidade_endereco: string | null; uf: string | null;
};

const STORAGE_KEY = "duarte_admin_pwd";

function AdminPage() {
  const [password, setPassword] = useState<string>("");
  const [authed, setAuthed] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPassword(stored);
      setAuthed(true);
    }
  }, []);

  const loginFn = useServerFn(adminLogin);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    try {
      await loginFn({ data: { password } });
      sessionStorage.setItem(STORAGE_KEY, password);
      setAuthed(true);
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
    setPassword("");
    setAuthed(false);
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
            {authed && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 size-4" /> Sair
              </Button>
            )}
          </div>
        </div>
      </header>

      {!authed ? (
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
        <AdminDashboard password={password} onAuthFail={handleLogout} />
      )}
    </div>
  );
}

function AdminDashboard({ password, onAuthFail }: { password: string; onAuthFail: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const listFn = useServerFn(adminListCadastros);
  const delFn = useServerFn(adminDeleteCadastro);

  async function load(searchTerm = "") {
    setLoading(true);
    try {
      const { rows } = await listFn({ data: { password, search: searchTerm || undefined } });
      setRows(rows as Row[]);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao carregar cadastros. Faça login novamente.");
      onAuthFail();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(""); /* eslint-disable-next-line */ }, []);

  // Filtro client-side adicional (em cima dos já buscados)
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.nome, r.email, r.telefone, r.municipio, r.cidade_endereco, r.bairro]
        .filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    );
  }, [rows, filter]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await delFn({ data: { password, id: toDelete.id } });
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
              placeholder="Pesquisar no servidor (nome, e-mail, telefone, município)..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>
      </div>

      <div className="mb-3">
        <Input
          placeholder="Filtrar resultados carregados..."
          value={filter} onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Município</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Instagram</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-6 animate-spin" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum cadastro encontrado.
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-border transition hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.criado_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.nome}</td>
                  <td className="px-4 py-3">
                    <div>{r.email}</div>
                    <div className="text-xs text-muted-foreground">{r.telefone}</div>
                  </td>
                  <td className="px-4 py-3">{r.municipio}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.cep && <div className="font-medium">{r.cep}</div>}
                    {(r.endereco || r.bairro) && (
                      <div>{[r.endereco, r.bairro].filter(Boolean).join(" — ")}</div>
                    )}
                    {(r.cidade_endereco || r.uf) && (
                      <div className="text-muted-foreground">
                        {[r.cidade_endereco, r.uf].filter(Boolean).join("/")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.instagram ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
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

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cadastro de{" "}
              <span className="font-semibold text-foreground">{toDelete?.nome}</span> ({toDelete?.email})
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
