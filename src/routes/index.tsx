import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CalendarClock, Check, CircleDollarSign, HandCoins, Nfc, Package, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState, MonthNav, PageHeader, PageSkeleton, Panel, Pill, ProgressBar, StatCard } from "@/components/ui-bits";
import { addDays, addMonths, availableStock, currentMonth, goalFor, monthSummary, percent, receivables, saleTotal, todayISO, topClients } from "@/lib/calc";
import { buildExample } from "@/lib/example";
import { brl, dateLabel, monthLabel } from "@/lib/format";
import { replaceAll, saveItem, useData } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "description", content: "Faturamento, lucro, meta do mês, valores a receber e próximos contatos das suas vendas de placas NFC." },
      { property: "og:title", content: "Visão geral — TocaiNFC" },
      { property: "og:description", content: "Faturamento, lucro, meta do mês, valores a receber e próximos contatos das suas vendas de placas NFC." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, ready } = useData();
  const [month, setMonth] = useState(currentMonth);
  if (!ready) return <PageSkeleton />;

  const isNew = state.sales.length === 0 && state.clients.length === 0 && state.settings.unitPrice === 0;
  if (isNew) {
    return (
      <div className="card-surface mx-auto max-w-2xl">
        <EmptyState icon={Nfc} title="Seu próximo resultado começa aqui" text="Comece informando o preço e o custo da sua placa. Depois cadastre clientes e registre cada venda — o painel faz as contas.">
          <Button asChild>
            <Link to="/configuracoes">Configurar minha placa</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              replaceAll(buildExample());
              toast.success("Dados de exemplo carregados. Apague quando quiser em Configurações.");
            }}
          >
            <Sparkles /> Ver com dados de exemplo
          </Button>
        </EmptyState>
      </div>
    );
  }

  const today = todayISO();
  const m = monthSummary(state, month);
  const goal = goalFor(state, month);
  const stock = availableStock(state);
  const toReceive = receivables(state);
  const toReceiveTotal = toReceive.reduce((a, s) => a + saleTotal(s), 0);
  const followUps = state.clients
    .filter((c) => c.nextContact && c.status !== "inativo" && c.nextContact <= addDays(today, 7))
    .sort((a, b) => a.nextContact.localeCompare(b.nextContact));
  const best = topClients(state, month).slice(0, 5);
  const series = [5, 4, 3, 2, 1, 0].map((back) => {
    const mm = addMonths(month, -back);
    const s = monthSummary(state, mm);
    return { label: monthLabel(mm, true), Faturamento: Math.round(s.revenue), Lucro: Math.round(s.profit) };
  });
  const clientName = (id: string) => state.clients.find((c) => c.id === id)?.name ?? "Venda avulsa";
  const hello = state.settings.sellerName ? `Olá, ${state.settings.sellerName}` : "Visão geral";

  return (
    <>
      <PageHeader title={hello} description="Acompanhe seus indicadores, oportunidades e resultados em um só lugar.">
        <MonthNav month={month} onChange={setMonth} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard highlight label="Faturamento" value={brl(m.revenue)} hint={`${brl(m.received)} já recebido`} icon={CircleDollarSign} />
        <StatCard label="Lucro" value={brl(m.profit)} hint={`Margem de ${m.margin.toFixed(0)}% depois de custos e taxas`} icon={TrendingUp} />
        <StatCard label="Placas vendidas" value={String(m.units)} hint={`${m.salesCount} ${m.salesCount === 1 ? "venda" : "vendas"} · ticket médio ${brl(m.ticket)}`} icon={Nfc} />
        <StatCard label="Estoque disponível" value={String(stock)} hint={stock <= state.settings.lowStock ? "Estoque baixo — hora de repor" : "Placas prontas para vender"} icon={Package} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Últimos 6 meses" className="lg:col-span-2">
          <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-chart-1" /> Faturamento</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-chart-2" /> Lucro</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={series} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip
                formatter={(v) => brl(Number(v))}
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 13 }}
              />
              <Bar dataKey="Faturamento" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Lucro" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Meta do mês" action={<Button asChild variant="link" size="sm" className="px-0"><Link to="/metas">Ajustar</Link></Button>}>
          {goal.revenue === 0 && goal.units === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não definiu uma meta. Com ela, o painel mostra quanto falta e o ritmo necessário.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Faturamento</span>
                  <span className="num font-semibold">{percent(m.revenue, goal.revenue)}%</span>
                </div>
                <ProgressBar value={percent(m.revenue, goal.revenue)} />
                <p className="mt-1.5 text-xs text-muted-foreground">{brl(m.revenue)} de {brl(goal.revenue)}</p>
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Placas</span>
                  <span className="num font-semibold">{percent(m.units, goal.units)}%</span>
                </div>
                <ProgressBar value={percent(m.units, goal.units)} />
                <p className="mt-1.5 text-xs text-muted-foreground">{m.units} de {goal.units} placas</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="A receber" action={<span className="num text-sm font-semibold">{brl(toReceiveTotal)}</span>}>
          {toReceive.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento pendente.</p>
          ) : (
            <ul className="divide-y">
              {toReceive.slice(0, 6).map((s) => {
                const late = Boolean(s.dueDate) && s.dueDate < today;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{clientName(s.clientId)}</div>
                      <div className="text-xs text-muted-foreground">
                        {brl(saleTotal(s))} · {s.dueDate ? `vence ${dateLabel(s.dueDate)}` : "sem vencimento"} {late ? <Pill tone="danger">atrasado</Pill> : null}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        saveItem("sales", { ...s, status: "pago" });
                        toast.success("Pagamento registrado.");
                      }}
                    >
                      <Check /> Recebi
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Próximos contatos" action={<CalendarClock className="size-4 text-muted-foreground" />}>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum retorno marcado para os próximos 7 dias. Agende em Clientes.</p>
          ) : (
            <ul className="divide-y">
              {followUps.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.company || c.city || "—"}</div>
                  </div>
                  {c.nextContact < today ? <Pill tone="danger">desde {dateLabel(c.nextContact).slice(0, 5)}</Pill> : c.nextContact === today ? <Pill tone="warning">hoje</Pill> : <Pill tone="muted">{dateLabel(c.nextContact).slice(0, 5)}</Pill>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Melhores clientes do mês" action={<HandCoins className="size-4 text-muted-foreground" />}>
          {best.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas para clientes cadastrados neste mês.</p>
          ) : (
            <ul className="divide-y">
              {best.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="num grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">{i + 1}</span>
                    <span className="truncate text-sm font-medium">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm font-semibold">{brl(c.revenue)}</div>
                    <div className="text-xs text-muted-foreground">{c.units} placas</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
