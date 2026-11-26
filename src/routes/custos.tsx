import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmDelete, EmptyState, Field, MonthNav, NumberInput, PageHeader, PageSkeleton, Panel, selectClass } from "@/components/ui-bits";
import { currentMonth, monthOf, monthSummary, todayISO } from "@/lib/calc";
import { brl, dateLabel } from "@/lib/format";
import { removeItem, saveItem, uid, useData, type Cost } from "@/lib/store";

export const Route = createFileRoute("/custos")({
  head: () => ({
    meta: [
      { title: "Custos — NFC Sales Hub" },
      { name: "description", content: "Lance fretes, anúncios, embalagens e outras despesas para saber o lucro real das suas vendas." },
      { property: "og:title", content: "Custos — NFC Sales Hub" },
      { property: "og:description", content: "Lance fretes, anúncios, embalagens e outras despesas para saber o lucro real das suas vendas." },
    ],
  }),
  component: CostsPage,
});

const CATEGORIES = ["Anúncios", "Frete", "Embalagem", "Personalização", "Transporte", "Ferramentas e sistemas", "Impostos", "Outros"];

function CostsPage() {
  const { state, ready } = useData();
  const [month, setMonth] = useState(currentMonth);
  const [form, setForm] = useState<Cost | null>(null);
  if (!ready) return <PageSkeleton />;

  const rows = state.costs.filter((c) => monthOf(c.date) === month).sort((a, b) => b.date.localeCompare(a.date));
  const m = monthSummary(state, month);
  const byCategory = CATEGORIES.map((cat) => ({ cat, total: rows.filter((c) => c.category === cat).reduce((a, c) => a + c.amount, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const isEdit = form ? state.costs.some((c) => c.id === form.id) : false;
  const open = () => setForm({ id: uid(), date: todayISO(), description: "", category: "Anúncios", amount: 0 });
  const set = (patch: Partial<Cost>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.description.trim()) return void toast.error("Descreva o custo.");
    if (form.amount <= 0) return void toast.error("Informe o valor.");
    saveItem("costs", form);
    setForm(null);
    toast.success(isEdit ? "Custo atualizado." : "Custo lançado.");
  };

  const lines: [string, number][] = [
    ["Faturamento", m.revenue],
    ["Custo das placas vendidas", -m.productCost],
    [`Taxas (${state.settings.feePercent}%)`, -m.fees],
    ["Despesas lançadas", -m.expenses],
  ];

  return (
    <>
      <PageHeader title="Custos" description="O custo de cada placa já entra sozinho pelas vendas. Aqui ficam as outras despesas.">
        <MonthNav month={month} onChange={setMonth} />
        <Button onClick={open}><Plus /> Novo custo</Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Para onde foi o dinheiro">
          <ul className="space-y-2.5 text-sm">
            {lines.map(([label, value]) => (
              <li key={label} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{label}</span>
                <span className="num font-medium">{brl(value)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t pt-3 text-base">
              <span className="font-semibold">Lucro do mês</span>
              <span className={`num font-semibold ${m.profit < 0 ? "text-destructive" : "text-success"}`}>{brl(m.profit)}</span>
            </li>
          </ul>
          {byCategory.length > 0 ? (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold">Despesas por tipo</h3>
              {byCategory.map(({ cat, total }) => (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{cat}</span>
                    <span className="num">{brl(total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-chart-3" style={{ width: `${(total / m.expenses) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <div className="card-surface overflow-hidden lg:col-span-2">
          {rows.length === 0 ? (
            <EmptyState icon={Wallet} title="Nenhuma despesa neste mês" text="Lance fretes, anúncios, embalagens e o que mais sair do seu bolso para vender.">
              <Button onClick={open}><Plus /> Novo custo</Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 text-right font-medium">Valor</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 whitespace-nowrap">{dateLabel(c.date)}</td>
                      <td className="px-4 py-3 font-medium">{c.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.category}</td>
                      <td className="num px-4 py-3 text-right font-semibold">{brl(c.amount)}</td>
                      <td className="px-2 py-2">
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Editar" onClick={() => setForm(c)}><Pencil /></Button>
                          <ConfirmDelete what="este custo" onConfirm={() => removeItem("costs", c.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          {form ? (
            <form onSubmit={submit} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>{isEdit ? "Editar custo" : "Novo custo"}</DialogTitle>
                <DialogDescription>Esse valor é descontado do lucro do mês.</DialogDescription>
              </DialogHeader>
              <Field label="Descrição"><Input autoFocus placeholder="Ex.: Anúncio no Instagram" value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor (R$)"><NumberInput value={form.amount} onChange={(amount) => set({ amount })} /></Field>
                <Field label="Data"><Input type="date" required value={form.date} onChange={(e) => set({ date: e.target.value })} /></Field>
              </div>
              <Field label="Tipo">
                <select className={selectClass} value={form.category} onChange={(e) => set({ category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
                <Button type="submit">Salvar custo</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
