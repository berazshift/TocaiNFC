import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Pencil, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete, EmptyState, Field, MonthNav, NumberInput, PageHeader, PageSkeleton, Pill, selectClass } from "@/components/ui-bits";
import { availableStock, currentMonth, monthOf, monthSummary, saleTotal, todayISO } from "@/lib/calc";
import { brl, dateLabel } from "@/lib/format";
import { removeItem, saveItem, uid, useData, type Sale, type SaleStatus } from "@/lib/store";

export const Route = createFileRoute("/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — TocaiNFC" },
      { name: "description", content: "Registre cada venda de placa NFC, acompanhe pagamentos pendentes e veja o total do mês." },
      { property: "og:title", content: "Vendas — TocaiNFC" },
      { property: "og:description", content: "Registre cada venda de placa NFC, acompanhe pagamentos pendentes e veja o total do mês." },
    ],
  }),
  component: SalesPage,
});

const PAYMENTS = ["Pix", "Cartão", "Dinheiro", "Boleto", "Transferência"];
const statusTone = { pago: "success", pendente: "warning", cancelado: "muted" } as const;
const statusLabel = { pago: "Pago", pendente: "A receber", cancelado: "Cancelada" } as const;

function SalesPage() {
  const { state, ready } = useData();
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<"todas" | SaleStatus>("todas");
  const [form, setForm] = useState<Sale | null>(null);
  if (!ready) return <PageSkeleton />;

  const { settings } = state;
  const rows = state.sales
    .filter((s) => monthOf(s.date) === month && (filter === "todas" || s.status === filter))
    .sort((a, b) => b.date.localeCompare(a.date));
  const m = monthSummary(state, month);
  const clientName = (id: string) => state.clients.find((c) => c.id === id)?.name ?? "Venda avulsa";
  const isEdit = form ? state.sales.some((s) => s.id === form.id) : false;
  const stock = availableStock(state) + (isEdit && form ? (state.sales.find((s) => s.id === form.id && s.status !== "cancelado")?.quantity ?? 0) : 0);

  const open = () =>
    setForm({ id: uid(), date: todayISO(), clientId: "", quantity: 1, unitPrice: settings.unitPrice, unitCost: settings.unitCost, discount: 0, payment: "Pix", status: "pago", dueDate: "", notes: "" });
  const set = (patch: Partial<Sale>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!Number.isInteger(form.quantity) || form.quantity < 1) return void toast.error("Informe uma quantidade inteira de placas.");
    if (!Number.isFinite(form.unitPrice) || form.unitPrice <= 0) return void toast.error("Informe um preço válido por placa.");
    if (!Number.isFinite(form.unitCost) || form.unitCost < 0) return void toast.error("Informe um custo válido por placa.");
    if (!Number.isFinite(form.discount) || form.discount < 0 || form.discount > form.quantity * form.unitPrice) return void toast.error("O desconto não pode ser maior que o valor bruto da venda.");
    if (form.status !== "cancelado" && form.quantity > stock) return void toast.error(`Estoque insuficiente. Disponível: ${stock} placas.`);
    if (form.status === "pendente" && !form.dueDate) return void toast.error("Informe a data de vencimento do pagamento pendente.");
    saveItem("sales", { ...form, dueDate: form.status === "pendente" ? form.dueDate : "" });
    setForm(null);
    toast.success(isEdit ? "Venda atualizada." : "Venda registrada.");
  };

  return (
    <>
      <PageHeader title="Vendas" description="Cada venda lançada aqui alimenta o faturamento, o lucro, as metas e o estoque.">
        <MonthNav month={month} onChange={setMonth} />
        <Button onClick={open}><Plus /> Nova venda</Button>
      </PageHeader>

      {settings.unitPrice === 0 ? (
        <div className="card-surface mb-4 flex flex-wrap items-center justify-between gap-3 border-warning/40 p-4 text-sm">
          <span>Defina o preço e o custo da sua placa para o lucro ser calculado certo.</span>
          <Button asChild variant="outline" size="sm"><Link to="/configuracoes">Configurar placa</Link></Button>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Faturamento do mês", brl(m.revenue)],
          ["Recebido", brl(m.received)],
          ["A receber", brl(m.pending)],
        ].map(([label, value]) => (
          <div key={label} className="card-surface px-4 py-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="num text-xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b p-3">
          {(["todas", "pago", "pendente", "cancelado"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)}>
              {f === "todas" ? "Todas" : statusLabel[f]}
            </Button>
          ))}
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma venda aqui" text="Registre uma venda para ela aparecer neste mês.">
            <Button onClick={open}><Plus /> Nova venda</Button>
          </EmptyState>
        ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Placas</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 whitespace-nowrap">{dateLabel(s.date)}</td>
                    <td className="px-4 py-3 font-medium">{clientName(s.clientId)}</td>
                    <td className="num px-4 py-3">{s.quantity}</td>
                    <td className="px-4 py-3">{s.payment}</td>
                    <td className="px-4 py-3">
                      <Pill tone={statusTone[s.status]}>{statusLabel[s.status]}</Pill>
                      {s.status === "pendente" && s.dueDate ? <span className="ml-2 text-xs text-muted-foreground">até {dateLabel(s.dueDate).slice(0, 5)}</span> : null}
                    </td>
                    <td className="num px-4 py-3 text-right font-semibold">{brl(saleTotal(s))}</td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end">
                        {s.status === "pendente" ? (
                          <Button variant="ghost" size="icon" className="size-8 text-success" aria-label="Marcar como pago" onClick={() => { saveItem("sales", { ...s, status: "pago" }); toast.success("Pagamento registrado."); }}>
                            <Check />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Editar" onClick={() => setForm(s)}>
                          <Pencil />
                        </Button>
                        <ConfirmDelete what="esta venda" onConfirm={() => removeItem("sales", s.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {rows.map((s) => (
              <article key={s.id} className="rounded-xl border border-border/80 bg-card p-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs text-muted-foreground">{dateLabel(s.date)}</p><p className="mt-1 truncate text-sm font-semibold">{clientName(s.clientId)}</p></div><Pill tone={statusTone[s.status]}>{statusLabel[s.status]}</Pill></div>
                <div className="mt-3 flex items-end justify-between gap-3"><p className="min-w-0 text-xs text-muted-foreground">{s.quantity} placas · {s.payment}{s.status === "pendente" && s.dueDate ? ` · vence ${dateLabel(s.dueDate)}` : ""}</p><strong className="num shrink-0 text-base">{brl(saleTotal(s))}</strong></div>
                <div className="mt-3 flex justify-end gap-1 border-t pt-2">
                  {s.status === "pendente" ? <Button variant="ghost" size="sm" className="text-success" onClick={() => { saveItem("sales", { ...s, status: "pago" }); toast.success("Pagamento registrado."); }}><Check /> Recebi</Button> : null}
                  <Button variant="ghost" size="sm" onClick={() => setForm(s)}><Pencil /> Editar</Button><ConfirmDelete what="esta venda" onConfirm={() => removeItem("sales", s.id)} />
                </div>
              </article>
            ))}
          </div>
          </>
        )}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          {form ? (
            <form onSubmit={submit} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>{isEdit ? "Editar venda" : "Nova venda"}</DialogTitle>
                <DialogDescription>{stock} placas disponíveis no estoque.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cliente" className="sm:col-span-2">
                  <select className={selectClass} value={form.clientId} onChange={(e) => set({ clientId: e.target.value })}>
                    <option value="">Venda avulsa (sem cliente)</option>
                    {[...state.clients].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Data"><Input type="date" required value={form.date} onChange={(e) => set({ date: e.target.value })} /></Field>
                <Field label="Quantidade de placas"><NumberInput step="1" value={form.quantity} onChange={(quantity) => set({ quantity })} /></Field>
                <Field label="Preço por placa (R$)"><NumberInput value={form.unitPrice} onChange={(unitPrice) => set({ unitPrice })} /></Field>
                <Field label="Desconto (R$)"><NumberInput value={form.discount} onChange={(discount) => set({ discount })} /></Field>
                <Field label="Forma de pagamento">
                  <select className={selectClass} value={form.payment} onChange={(e) => set({ payment: e.target.value })}>
                    {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Situação">
                  <select className={selectClass} value={form.status} onChange={(e) => set({ status: e.target.value as SaleStatus })}>
                    <option value="pago">Pago</option>
                    <option value="pendente">A receber</option>
                    <option value="cancelado">Cancelada</option>
                  </select>
                </Field>
                {form.status === "pendente" ? (
                  <Field label="Vence em" className="sm:col-span-2"><Input type="date" required value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></Field>
                ) : null}
                <Field label="Observações" className="sm:col-span-2"><Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
              </div>
              {form.quantity > stock ? <p className="text-sm text-warning">Atenção: essa quantidade passa do estoque disponível.</p> : null}
              <div className="flex items-center justify-between rounded-lg bg-accent px-4 py-3 text-accent-foreground">
                <span className="text-sm font-medium">Total da venda</span>
                <span className="num text-xl font-semibold">{brl(saleTotal(form))}</span>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
                <Button type="submit">Salvar venda</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
