import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Pencil, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete, EmptyState, Field, PageHeader, PageSkeleton, Pill, selectClass } from "@/components/ui-bits";
import { clientTotals, todayISO } from "@/lib/calc";
import { brl, dateLabel } from "@/lib/format";
import { removeItem, saveItem, uid, useData, type Client, type ClientStatus } from "@/lib/store";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — NFC Sales Hub" },
      { name: "description", content: "Sua carteira de clientes e contatos em negociação, com histórico de compras e data do próximo retorno." },
      { property: "og:title", content: "Clientes — NFC Sales Hub" },
      { property: "og:description", content: "Sua carteira de clientes e contatos em negociação, com histórico de compras e data do próximo retorno." },
    ],
  }),
  component: ClientsPage,
});

const STATUS: Record<ClientStatus, { label: string; tone: "success" | "warning" | "primary" | "muted" }> = {
  lead: { label: "Novo contato", tone: "primary" },
  negociando: { label: "Negociando", tone: "warning" },
  cliente: { label: "Cliente", tone: "success" },
  inativo: { label: "Inativo", tone: "muted" },
};
const ORDER = Object.keys(STATUS) as ClientStatus[];

const whatsapp = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? "55" + d : d}`;
};

function ClientsPage() {
  const { state, ready } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | ClientStatus>("todos");
  const [form, setForm] = useState<Client | null>(null);
  if (!ready) return <PageSkeleton />;

  const today = todayISO();
  const q = query.trim().toLowerCase();
  const rows = state.clients
    .filter((c) => (filter === "todos" || c.status === filter) && (!q || `${c.name} ${c.company} ${c.city} ${c.phone}`.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const isEdit = form ? state.clients.some((c) => c.id === form.id) : false;
  const open = () => setForm({ id: uid(), name: "", company: "", phone: "", email: "", city: "", status: "lead", notes: "", nextContact: "", createdAt: today });
  const set = (patch: Partial<Client>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return void toast.error("Informe o nome do cliente.");
    saveItem("clients", { ...form, name: form.name.trim() });
    setForm(null);
    toast.success(isEdit ? "Cliente atualizado." : "Cliente cadastrado.");
  };

  return (
    <>
      <PageHeader title="Clientes" description="Quem já comprou, quem está negociando e quando voltar a falar com cada um.">
        <Button onClick={open}><Plus /> Novo cliente</Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ORDER.map((s) => (
          <button key={s} type="button" onClick={() => setFilter(filter === s ? "todos" : s)} className={`card-surface px-4 py-3 text-left transition-colors ${filter === s ? "border-primary" : "hover:border-ring"}`}>
            <div className="text-xs text-muted-foreground">{STATUS[s].label}</div>
            <div className="num text-2xl font-semibold">{state.clients.filter((c) => c.status === s).length}</div>
          </button>
        ))}
      </div>

      <div className="card-surface overflow-hidden">
        <div className="border-b p-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, empresa ou cidade" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title={state.clients.length === 0 ? "Nenhum cliente ainda" : "Nada encontrado"} text={state.clients.length === 0 ? "Cadastre seus clientes e contatos para acompanhar compras e retornos." : "Tente outra busca ou limpe o filtro."}>
            {state.clients.length === 0 ? <Button onClick={open}><Plus /> Novo cliente</Button> : null}
          </EmptyState>
        ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 font-medium">Compras</th>
                  <th className="px-4 py-3 font-medium">Última compra</th>
                  <th className="px-4 py-3 font-medium">Próximo contato</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((c) => {
                  const t = clientTotals(state, c.id);
                  return (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{[c.company, c.city].filter(Boolean).join(" · ") || "—"}</div>
                      </td>
                      <td className="px-4 py-3"><Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill></td>
                      <td className="px-4 py-3">
                        <div className="num font-semibold">{brl(t.total)}</div>
                        <div className="text-xs text-muted-foreground">{t.count} {t.count === 1 ? "venda" : "vendas"}</div>
                      </td>
                      <td className="px-4 py-3">{dateLabel(t.last)}</td>
                      <td className="px-4 py-3">
                        {c.nextContact ? (c.nextContact < today ? <Pill tone="danger">{dateLabel(c.nextContact)}</Pill> : c.nextContact === today ? <Pill tone="warning">hoje</Pill> : dateLabel(c.nextContact)) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-end">
                          {c.phone ? (
                            <Button asChild variant="ghost" size="icon" className="size-8 text-success">
                              <a href={whatsapp(c.phone)} target="_blank" rel="noreferrer" aria-label={`Chamar ${c.name} no WhatsApp`}><MessageCircle /></a>
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Editar" onClick={() => setForm(c)}><Pencil /></Button>
                          <ConfirmDelete what={c.name} onConfirm={() => removeItem("clients", c.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {rows.map((c) => {
              const t = clientTotals(state, c.id);
              return <article key={c.id} className="rounded-xl border border-border/80 bg-card p-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{c.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{[c.company, c.city].filter(Boolean).join(" · ") || "Sem empresa ou cidade"}</p></div><Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill></div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2.5">
                  <div><p className="text-[11px] text-muted-foreground">Total comprado</p><p className="num text-sm font-semibold">{brl(t.total)}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Última compra</p><p className="text-sm font-medium">{dateLabel(t.last)}</p></div>
                  <div className="col-span-2"><p className="text-[11px] text-muted-foreground">Próximo contato</p><p className="text-sm font-medium">{c.nextContact ? dateLabel(c.nextContact) : "Não agendado"}</p></div>
                </div>
                <div className="mt-2 flex justify-end gap-1">{c.phone ? <Button asChild variant="ghost" size="sm" className="text-success"><a href={whatsapp(c.phone)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button> : null}<Button variant="ghost" size="sm" onClick={() => setForm(c)}><Pencil /> Editar</Button><ConfirmDelete what={c.name} onConfirm={() => removeItem("clients", c.id)} /></div>
              </article>;
            })}
          </div>
          </>
        )}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          {form ? (
            <form onSubmit={submit} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
                <DialogDescription>Só o nome é obrigatório.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome"><Input autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
                <Field label="Empresa / negócio"><Input value={form.company} onChange={(e) => set({ company: e.target.value })} /></Field>
                <Field label="WhatsApp"><Input type="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
                <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
                <Field label="Cidade"><Input value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                <Field label="Situação">
                  <select className={selectClass} value={form.status} onChange={(e) => set({ status: e.target.value as ClientStatus })}>
                    {ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                </Field>
                <Field label="Próximo contato" hint="Aparece na Visão geral quando chegar o dia." className="sm:col-span-2">
                  <Input type="date" value={form.nextContact} onChange={(e) => set({ nextContact: e.target.value })} />
                </Field>
                <Field label="Anotações" className="sm:col-span-2"><Textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
                <Button type="submit">Salvar cliente</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
