import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Pencil, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmDelete, EmptyState, Field, MonthNav, NumberInput, PageHeader, PageSkeleton, Panel, selectClass } from "@/components/ui-bits";
import { currentMonth, monthOf, monthSummary, todayISO } from "@/lib/calc";
import { brl, dateLabel } from "@/lib/format";
import { removeItem, saveItem, saveStockPurchase, uid, useData, type Cost, type StockPurchase } from "@/lib/store";

export const Route = createFileRoute("/custos")({
  head: () => ({ meta: [
    { title: "Custos — NFC Sales Hub" },
    { name: "description", content: "Controle despesas, compras de placas, lucro e fluxo de caixa." },
    { property: "og:title", content: "Custos — NFC Sales Hub" },
    { property: "og:description", content: "Controle despesas, compras de placas, lucro e fluxo de caixa." },
  ] }),
  component: CostsPage,
});
const CATEGORIES = ["Anúncios", "Frete", "Embalagem", "Personalização", "Transporte", "Ferramentas e sistemas", "Impostos", "Outros"];

function CostsPage() {
  const { state, ready } = useData();
  const [month, setMonth] = useState(currentMonth);
  const [form, setForm] = useState<Cost | null>(null);
  const [purchaseForm, setPurchaseForm] = useState<StockPurchase | null>(null);
  if (!ready) return <PageSkeleton />;

  const rows = state.costs.filter((c) => monthOf(c.date) === month).sort((a, b) => b.date.localeCompare(a.date));
  const purchases = state.stockPurchases.filter((p) => monthOf(p.date) === month).sort((a, b) => b.date.localeCompare(a.date));
  const m = monthSummary(state, month);
  const byCategory = CATEGORIES.map((cat) => ({ cat, total: rows.filter((c) => c.category === cat).reduce((a, c) => a + c.amount, 0) })
    ).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const isEdit = form ? state.costs.some((c) => c.id === form.id) : false;
  const open = () => setForm({ id: uid(), date: todayISO(), description: "", category: "Anúncios", amount: 0 });
  const openPurchase = () => setPurchaseForm({ id: uid(), date: todayISO(), quantity: 1, unitCost: state.settings.unitCost, description: "Compra de placas NFC" });
  const set = (patch: Partial<Cost>) => setForm((f) => f ? { ...f, ...patch } : f);
  const setPurchase = (patch: Partial<StockPurchase>) => setPurchaseForm((f) => f ? { ...f, ...patch } : f);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.description.trim()) return void toast.error("Descreva o custo.");
    if (form.amount <= 0) return void toast.error("Informe o valor.");
    saveItem("costs", form); setForm(null); toast.success(isEdit ? "Custo atualizado." : "Custo lançado.");
  };
  const submitPurchase = (e: FormEvent) => {
    e.preventDefault();
    if (!purchaseForm) return;
    if (!Number.isInteger(purchaseForm.quantity) || purchaseForm.quantity < 1) return void toast.error("Informe uma quantidade inteira de placas.");
    if (!Number.isFinite(purchaseForm.unitCost) || purchaseForm.unitCost < 0) return void toast.error("Informe um custo unitário válido.");
    if (!purchaseForm.description.trim()) return void toast.error("Descreva a compra.");
    saveStockPurchase(purchaseForm);
    setPurchaseForm(null);
    toast.success("Compra registrada, estoque atualizado e saída de caixa contabilizada.");
  };

  const lines: [string, number][] = [
    ["Faturamento (vendas)", m.revenue],
    ["Custo total das placas compradas", -m.stockPurchases],
    [`Taxas (${state.settings.feePercent}%)`, -m.fees],
    ["Despesas operacionais", -m.expenses],
  ];

  return <>
    <PageHeader title="Custos e caixa" description="O custo de todas as placas compradas no mês é descontado do resultado, mesmo que ainda estejam em estoque.">
      <MonthNav month={month} onChange={setMonth} />
      <Button variant="outline" onClick={openPurchase}><Package /> Comprar placas</Button>
      <Button onClick={open}><Plus /> Novo custo</Button>
    </PageHeader>

    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <div className="card-surface p-4"><p className="text-xs text-muted-foreground">Resultado do mês</p><p className={`num mt-1 text-2xl font-semibold ${m.profit < 0 ? "text-destructive" : "text-success"}`}>{brl(m.profit)}</p><p className="mt-1 text-xs text-muted-foreground">Faturamento menos compras totais, taxas e despesas</p></div>
      <div className="card-surface p-4"><p className="text-xs text-muted-foreground">Saldo de caixa do mês</p><p className={`num mt-1 text-2xl font-semibold ${m.cashBalance < 0 ? "text-destructive" : "text-foreground"}`}>{brl(m.cashBalance)}</p><p className="mt-1 text-xs text-muted-foreground">Recebido − compras − despesas − taxas sobre recebidos</p></div>
      <div className="card-surface p-4"><p className="text-xs text-muted-foreground">Capital no estoque atual</p><p className="num mt-1 text-2xl font-semibold">{brl(m.inventoryValue)}</p><p className="mt-1 text-xs text-muted-foreground">Valor estimado das placas ainda disponíveis</p></div>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Composição do lucro">
        <ul className="space-y-2.5 text-sm">
          {lines.map(([label, value]) => <li key={label} className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="num font-medium">{brl(value)}</span></li>)}
          <li className="flex justify-between gap-3 border-t pt-3 text-base"><span className="font-semibold">Lucro do mês</span><span className={`num font-semibold ${m.profit < 0 ? "text-destructive" : "text-success"}`}>{brl(m.profit)}</span></li>
        </ul>
        <div className="mt-5 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold">Fluxo de caixa</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Vendas recebidas</span><span className="num">{brl(m.received)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Compras de placas</span><span className="num">− {brl(m.stockPurchases)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Despesas e taxas</span><span className="num">− {brl(m.expenses + m.received * state.settings.feePercent / 100)}</span></li>
            <li className="flex justify-between border-t pt-2 font-semibold"><span>Saldo de caixa</span><span className="num">{brl(m.cashBalance)}</span></li>
          </ul>
        </div>
        {byCategory.length > 0 ? <div className="mt-6 space-y-3"><h3 className="text-sm font-semibold">Despesas por tipo</h3>{byCategory.map(({ cat, total }) => <div key={cat}><div className="mb-1 flex justify-between text-xs"><span>{cat}</span><span className="num">{brl(total)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-chart-3" style={{ width: `${(total / m.expenses) * 100}%` }} /></div></div>)}</div> : null}
      </Panel>

      <div className="space-y-4 lg:col-span-2">
        <Panel title="Compras de placas neste mês" action={<span className="num text-sm font-semibold">{brl(m.stockPurchases)}</span>}>
          {purchases.length === 0 ? <div className="py-2 text-sm text-muted-foreground">Nenhuma compra registrada neste mês.<Button className="ml-2" size="sm" variant="outline" onClick={openPurchase}><Plus /> Registrar compra</Button></div> :
            <div className="space-y-3">{purchases.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold">{p.description}</p><p className="text-xs text-muted-foreground">{dateLabel(p.date)} · {p.quantity} placas × {brl(p.unitCost)}</p></div><strong className="num shrink-0 text-sm">{brl(p.quantity * p.unitCost)}</strong></div>)}</div>}
        </Panel>

        <div className="card-surface overflow-hidden">
          <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">Despesas operacionais</h2><p className="text-xs text-muted-foreground">Frete, anúncios, embalagem e outros gastos.</p></div><span className="num text-sm font-semibold">{brl(m.expenses)}</span></div>
          {rows.length === 0 ? <EmptyState icon={Wallet} title="Nenhuma despesa neste mês" text="Registre outras saídas do negócio, além das compras de placas."><Button onClick={open}><Plus /> Novo custo</Button></EmptyState> : <>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[480px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr className="border-b"><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Descrição</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 text-right font-medium">Valor</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y">{rows.map((c) => <tr key={c.id} className="hover:bg-muted/40"><td className="whitespace-nowrap px-4 py-3">{dateLabel(c.date)}</td><td className="px-4 py-3 font-medium">{c.description}</td><td className="px-4 py-3 text-muted-foreground">{c.category}</td><td className="num px-4 py-3 text-right font-semibold">{brl(c.amount)}</td><td className="px-2 py-2"><div className="flex justify-end"><Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Editar" onClick={() => setForm(c)}><Pencil /></Button><ConfirmDelete what="este custo" onConfirm={() => removeItem("costs", c.id)} /></div></td></tr>)}</tbody></table></div>
            <div className="grid gap-3 p-3 md:hidden">{rows.map((c) => <article key={c.id} className="rounded-xl border border-border/80 bg-card p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{c.description}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(c.date)} · {c.category}</p></div><strong className="num shrink-0 text-sm">{brl(c.amount)}</strong></div><div className="mt-2 flex justify-end gap-1 border-t pt-2"><Button variant="ghost" size="sm" onClick={() => setForm(c)}><Pencil /> Editar</Button><ConfirmDelete what="este custo" onConfirm={() => removeItem("costs", c.id)} /></div></article>)}</div>
          </>}
        </div>
      </div>
    </div>

    <Dialog open={purchaseForm !== null} onOpenChange={(o) => !o && setPurchaseForm(null)}>
      <DialogContent className="sm:max-w-md">{purchaseForm ? <form onSubmit={submitPurchase} className="grid gap-4">
        <DialogHeader><DialogTitle>Registrar compra de placas</DialogTitle><DialogDescription>A quantidade aumenta o estoque e o valor total da compra é descontado do resultado e do caixa no mês da compra.</DialogDescription></DialogHeader>
        <Field label="Descrição"><Input value={purchaseForm.description} onChange={(e) => setPurchase({ description: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Quantidade de placas"><NumberInput step="1" value={purchaseForm.quantity} onChange={(quantity) => setPurchase({ quantity })} /></Field><Field label="Custo por placa (R$)"><NumberInput value={purchaseForm.unitCost} onChange={(unitCost) => setPurchase({ unitCost })} /></Field></div>
        <Field label="Data da compra"><Input type="date" required value={purchaseForm.date} onChange={(e) => setPurchase({ date: e.target.value })} /></Field>
        <div className="rounded-lg bg-accent px-4 py-3 text-accent-foreground"><div className="flex justify-between text-sm"><span>Total da compra</span><strong className="num">{brl(purchaseForm.quantity * purchaseForm.unitCost)}</strong></div></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setPurchaseForm(null)}>Cancelar</Button><Button type="submit">Registrar compra</Button></DialogFooter>
      </form> : null}</DialogContent>
    </Dialog>

    <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
      <DialogContent className="sm:max-w-md">{form ? <form onSubmit={submit} className="grid gap-4">
        <DialogHeader><DialogTitle>{isEdit ? "Editar custo" : "Novo custo"}</DialogTitle><DialogDescription>Esse valor é descontado do lucro e do caixa do mês.</DialogDescription></DialogHeader>
        <Field label="Descrição"><Input autoFocus placeholder="Ex.: Anúncio no Instagram" value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Valor (R$)"><NumberInput value={form.amount} onChange={(amount) => set({ amount })} /></Field><Field label="Data"><Input type="date" required value={form.date} onChange={(e) => set({ date: e.target.value })} /></Field></div>
        <Field label="Tipo"><select className={selectClass} value={form.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit">Salvar custo</Button></DialogFooter>
      </form> : null}</DialogContent>
    </Dialog>
  </>;
}
