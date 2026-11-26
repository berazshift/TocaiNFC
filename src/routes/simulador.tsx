import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Info, Percent, PiggyBank, Receipt, RotateCcw, Tag, TrendingUp, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NumberInput, PageHeader, PageSkeleton, Panel, Pill, StatCard } from "@/components/ui-bits";
import { simulateSale } from "@/lib/calc";
import { brl } from "@/lib/format";
import { useData, type Settings } from "@/lib/store";
import { cn } from "@/lib/utils";

const DESCRIPTION = "Simule quantas placas NFC vender, a que preço, e veja o faturamento e o lucro estimados antes de fechar negócio.";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Simulador de vendas — TocaiNFC" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SimulatorPage,
});

const SCENARIOS = [10, 25, 50, 100];
const percentLabel = (n: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Number.isFinite(n) ? n : 0)}%`;

function SimulatorPage() {
  const { state, ready } = useData();
  if (!ready) return <PageSkeleton />;
  return <Simulator settings={state.settings} />;
}

function QuantityInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label="Quantidade de placas"
      value={draft}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
        setDraft(digits);
        const parsed = Number(digits);
        if (digits !== "" && parsed >= 1) onChange(parsed);
      }}
      onBlur={() => setDraft(String(value))}
      className="h-10 rounded-xl bg-card text-[13px] shadow-sm"
    />
  );
}

function Simulator({ settings }: { settings: Settings }) {
  const [quantity, setQuantity] = useState(10);
  const [unitPrice, setUnitPrice] = useState(settings.unitPrice);
  const [unitCost, setUnitCost] = useState(settings.unitCost);
  const [feePercent, setFeePercent] = useState(settings.feePercent);
  const [extraExpenses, setExtraExpenses] = useState(0);

  const r = simulateSale({ quantity, unitPrice, unitCost, feePercent, extraExpenses });
  const loss = r.profit < 0;
  const reset = () => {
    setQuantity(10); setUnitPrice(settings.unitPrice); setUnitCost(settings.unitCost);
    setFeePercent(settings.feePercent); setExtraExpenses(0);
  };

  const scale = Math.max(r.revenue, r.totalCosts);
  const parts = [
    { label: "Custo estimado das unidades", value: r.unitsCost, color: "bg-primary" },
    { label: "Taxas", value: r.fees, color: "bg-warning" },
    { label: "Despesas extras", value: r.extraExpenses, color: "bg-muted-foreground/50" },
    { label: "Lucro estimado", value: Math.max(0, r.profit), color: "bg-success" },
  ];

  return (
    <>
      <PageHeader title="Simulador de vendas" description="Teste cenários e veja quanto faturaria e quanto sobraria. É só uma projeção: nada aqui é salvo nem altera suas vendas ou seu estoque.">
        <Button variant="outline" className="rounded-xl" onClick={reset}><RotateCcw className="size-4" /> Usar valores configurados</Button>
      </PageHeader>

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/10 bg-accent px-4 py-3 text-[12px] leading-relaxed text-accent-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>Projeção, não lançamento financeiro.</strong> O custo das unidades é uma estimativa só das placas simuladas.
          No fechamento real do mês, todas as placas compradas no mês são descontadas, mesmo as que ainda estão em estoque.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Cenário" className="lg:col-span-1">
          <div className="grid gap-4">
            <Field label="Quantidade de placas" hint="Número inteiro, a partir de 1.">
              <QuantityInput value={quantity} onChange={setQuantity} />
            </Field>
            <div>
              <div className="mb-2 text-[11px] font-semibold text-muted-foreground">Cenários rápidos</div>
              <div className="grid grid-cols-4 gap-2">
                {SCENARIOS.map((n) => (
                  <Button key={n} type="button" size="sm" variant={quantity === n ? "default" : "outline"} className="rounded-lg" aria-pressed={quantity === n} onClick={() => setQuantity(n)}>
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço unitário (R$)" hint={`Configurado: ${brl(settings.unitPrice)}`}>
                <NumberInput value={unitPrice} onChange={setUnitPrice} />
              </Field>
              <Field label="Custo unitário (R$)" hint={`Configurado: ${brl(settings.unitCost)}`}>
                <NumberInput value={unitCost} onChange={setUnitCost} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Taxa de venda (%)" hint={`Configurada: ${percentLabel(settings.feePercent)}`}>
                <NumberInput value={feePercent} onChange={(n) => setFeePercent(Math.min(100, n))} />
              </Field>
              <Field label="Despesas extras (R$)" hint="Opcional: frete, brindes…">
                <NumberInput value={extraExpenses} onChange={setExtraExpenses} />
              </Field>
            </div>
          </div>
        </Panel>

        <div className="grid content-start gap-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Faturamento bruto" value={brl(r.revenue)} hint={`${r.units} ${r.units === 1 ? "placa" : "placas"} × ${brl(r.unitPrice)}`} icon={Receipt} />
            <StatCard label={loss ? "Prejuízo estimado" : "Lucro estimado"} value={brl(r.profit)} hint={`Margem de ${percentLabel(r.margin)} · ${brl(r.profitPerUnit)} por placa`} icon={PiggyBank} highlight />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Custo estimado" value={brl(r.unitsCost)} hint={`${r.units} × ${brl(r.unitCost)}`} icon={Boxes} />
            <StatCard label="Taxas" value={brl(r.fees)} hint={`${percentLabel(r.feePercent)} do faturamento`} icon={Percent} />
            <StatCard label="Despesas extras" value={brl(r.extraExpenses)} hint="Informadas no cenário" icon={Wallet} />
            <StatCard label="Margem de lucro" value={percentLabel(r.margin)} hint="Lucro ÷ faturamento" icon={TrendingUp} />
          </div>

          <Panel title="Para onde vai o faturamento" action={<Pill tone={loss ? "danger" : r.profit > 0 ? "success" : "muted"}>{loss ? "Cenário com prejuízo" : r.profit > 0 ? "Cenário com lucro" : "Sem sobra"}</Pill>}>
            {scale > 0 ? (
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/50" role="img" aria-label="Composição do faturamento simulado">
                {parts.map((p) => p.value > 0 ? <div key={p.label} className={cn("h-full transition-all duration-300", p.color)} style={{ width: `${p.value / scale * 100}%` }} /> : null)}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">Informe o preço de venda para ver a composição.</p>
            )}
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {parts.map((p) => (
                <li key={p.label} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2"><span className={cn("size-2.5 shrink-0 rounded-full", p.color)} /><span className="truncate">{p.label}</span></span>
                  <span className="num shrink-0 font-semibold">{brl(p.value)} <span className="font-normal text-muted-foreground">· {percentLabel(r.revenue > 0 ? p.value / r.revenue * 100 : 0)}</span></span>
                </li>
              ))}
            </ul>
            {loss ? <p className="mt-4 text-[12px] text-destructive">Neste cenário os custos passam do faturamento em {brl(-r.profit)}.</p> : null}
          </Panel>

          <Panel title="Resumo do cenário">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Boxes className="size-3.5" /> Unidades simuladas</dt><dd className="num mt-1 text-xl font-semibold">{r.units}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Tag className="size-3.5" /> Preço médio</dt><dd className="num mt-1 text-xl font-semibold">{brl(r.averagePrice)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Custos totais</dt><dd className="num mt-1 text-xl font-semibold">{brl(r.totalCosts)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Cobre as despesas com</dt><dd className="num mt-1 text-xl font-semibold">{r.breakEvenUnits === null ? "—" : `${r.breakEvenUnits} ${r.breakEvenUnits === 1 ? "placa" : "placas"}`}</dd></div>
            </dl>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">Valores estimados para este cenário. Para registrar uma venda de verdade, use a página Vendas.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
