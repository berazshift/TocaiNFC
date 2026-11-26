import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, MonthNav, NumberInput, PageHeader, PageSkeleton, Panel, Pill, ProgressBar } from "@/components/ui-bits";
import { addMonths, currentMonth, daysInMonth, goalFor, monthSummary, percent, todayISO } from "@/lib/calc";
import { brl, monthLabel } from "@/lib/format";
import { saveGoal, useData, type State } from "@/lib/store";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { name: "description", content: "Defina a meta de faturamento e de placas do mês e veja quanto falta e o ritmo diário para chegar lá." },
      { property: "og:title", content: "Metas — TocaiNFC" },
      { property: "og:description", content: "Defina a meta de faturamento e de placas do mês e veja quanto falta e o ritmo diário para chegar lá." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { state, ready } = useData();
  const [month, setMonth] = useState(currentMonth);
  if (!ready) return <PageSkeleton />;

  const m = monthSummary(state, month);
  const goal = goalFor(state, month);
  const isCurrent = month === currentMonth();
  const day = Number(todayISO().slice(8, 10));
  const total = daysInMonth(month);
  const daysLeft = total - day + 1;
  const missing = Math.max(0, goal.revenue - m.revenue);
  const missingUnits = Math.max(0, goal.units - m.units);
  const projection = (m.revenue / day) * total;

  return (
    <>
      <PageHeader title="Metas" description="Quanto você quer vender e como está o caminho até lá.">
        <MonthNav month={month} onChange={setMonth} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          <Panel title="Faturamento">
            <div className="num text-4xl font-semibold">{percent(m.revenue, goal.revenue)}%</div>
            <div className="my-3"><ProgressBar value={percent(m.revenue, goal.revenue)} /></div>
            <p className="text-sm text-muted-foreground">{brl(m.revenue)} de {goal.revenue ? brl(goal.revenue) : "meta não definida"}</p>
            {goal.revenue > 0 ? <p className="mt-2 text-sm">{missing === 0 ? <Pill tone="success">Meta batida</Pill> : <>Faltam <strong className="num">{brl(missing)}</strong></>}</p> : null}
          </Panel>
          <Panel title="Placas">
            <div className="num text-4xl font-semibold">{percent(m.units, goal.units)}%</div>
            <div className="my-3"><ProgressBar value={percent(m.units, goal.units)} /></div>
            <p className="text-sm text-muted-foreground">{m.units} de {goal.units ? `${goal.units} placas` : "meta não definida"}</p>
            {goal.units > 0 ? <p className="mt-2 text-sm">{missingUnits === 0 ? <Pill tone="success">Meta batida</Pill> : <>Faltam <strong className="num">{missingUnits}</strong> placas</>}</p> : null}
          </Panel>
          {isCurrent && goal.revenue > 0 ? (
            <Panel title="Ritmo para bater a meta" className="sm:col-span-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-muted-foreground">Dias restantes</div>
                  <div className="num text-2xl font-semibold">{daysLeft}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Precisa vender por dia</div>
                  <div className="num text-2xl font-semibold">{brl(missing / daysLeft)}</div>
                  <div className="text-xs text-muted-foreground">≈ {Math.ceil(missingUnits / daysLeft)} placas por dia</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Se continuar assim, fecha em</div>
                  <div className="num text-2xl font-semibold">{brl(projection)}</div>
                  <div className="text-xs text-muted-foreground">{projection >= goal.revenue ? "acima da meta" : "abaixo da meta"}</div>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>

        <GoalForm key={`${month}-${goal.revenue}-${goal.units}`} month={month} revenue={goal.revenue} units={goal.units} custom={goal.custom} />
      </div>

      <History state={state} month={month} />
    </>
  );
}

function GoalForm({ month, revenue, units, custom }: { month: string; revenue: number; units: number; custom: boolean }) {
  const [r, setR] = useState(revenue);
  const [u, setU] = useState(units);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    saveGoal({ month, revenue: r, units: u });
    toast.success(`Meta de ${monthLabel(month)} salva.`);
  };
  return (
    <Panel title={`Meta de ${monthLabel(month)}`}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Faturamento (R$)"><NumberInput value={r} onChange={setR} /></Field>
        <Field label="Placas vendidas"><NumberInput step="1" value={u} onChange={setU} /></Field>
        <Button type="submit">Salvar meta</Button>
        <p className="text-xs text-muted-foreground">
          {custom ? "Este mês tem uma meta própria." : "Este mês está usando a meta padrão das Configurações."}
        </p>
      </form>
    </Panel>
  );
}

function History({ state, month }: { state: State; month: string }) {
  const rows = [0, 1, 2, 3, 4, 5].map((back) => {
    const mm = addMonths(month, -back);
    return { month: mm, s: monthSummary(state, mm), g: goalFor(state, mm) };
  });
  return (
    <Panel title="Histórico" className="mt-4">
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Mês</th>
              <th className="py-2 pr-4 font-medium">Meta</th>
              <th className="py-2 pr-4 font-medium">Vendido</th>
              <th className="py-2 pr-4 font-medium">Placas</th>
              <th className="py-2 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ month: mm, s, g }) => {
              const p = percent(s.revenue, g.revenue);
              return (
                <tr key={mm}>
                  <td className="py-2.5 pr-4 first-letter:uppercase">{monthLabel(mm)}</td>
                  <td className="num py-2.5 pr-4">{g.revenue ? brl(g.revenue) : "—"}</td>
                  <td className="num py-2.5 pr-4 font-semibold">{brl(s.revenue)}</td>
                  <td className="num py-2.5 pr-4">{s.units}{g.units ? ` / ${g.units}` : ""}</td>
                  <td className="py-2.5">{g.revenue ? <Pill tone={p >= 100 ? "success" : p >= 70 ? "warning" : "muted"}>{p}%</Pill> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:hidden">
        {rows.map(({ month: mm, s, g }) => {
          const p = percent(s.revenue, g.revenue);
          return <article key={mm} className="rounded-xl border border-border/80 bg-card p-3">
            <div className="flex items-center justify-between gap-3"><strong className="capitalize text-sm">{monthLabel(mm)}</strong>{g.revenue ? <Pill tone={p >= 100 ? "success" : p >= 70 ? "warning" : "muted"}>{p}% da meta</Pill> : <Pill tone="muted">Sem meta</Pill>}</div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Meta</p><p className="num font-medium">{g.revenue ? brl(g.revenue) : "—"}</p></div><div><p className="text-xs text-muted-foreground">Vendido</p><p className="num font-semibold">{brl(s.revenue)}</p></div><div><p className="text-xs text-muted-foreground">Placas</p><p className="num font-medium">{s.units}{g.units ? ` / ${g.units}` : ""}</p></div></div>
          </article>;
        })}
      </div>
    </Panel>
  );
}
