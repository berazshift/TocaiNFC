import type { Sale, State } from "./store";
const pad = (n: number) => String(n).padStart(2, "0");
export function todayISO(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export const currentMonth = () => todayISO().slice(0, 7);
export const monthOf = (date: string) => date.slice(0, 7);
export function addMonths(month: string, n: number) {
  const [y = 2000, m = 1] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function addDays(date: string, n: number) {
  const [y = 2000, m = 1, d = 1] = date.split("-").map(Number); return todayISO(new Date(y, m - 1, d + n));
}
export function daysInMonth(month: string) { const [y = 2000, m = 1] = month.split("-").map(Number); return new Date(y, m, 0).getDate(); }
export const saleTotal = (s: Sale) => Math.max(0, s.quantity * s.unitPrice - s.discount);
export const saleCost = (s: Sale) => s.quantity * s.unitCost;
const active = (s: Sale) => s.status !== "cancelado";
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export interface MonthSummary {
  revenue: number; received: number; pending: number; units: number; salesCount: number;
  productCost: number; fees: number; expenses: number; profit: number; margin: number; ticket: number;
  stockPurchases: number; cashBalance: number; inventoryValue: number;
}
/** Resultado mensal considera o custo integral das placas compradas no mês, vendidas ou ainda em estoque. */
export function monthSummary(state: State, month: string): MonthSummary {
  const sales = state.sales.filter((s) => active(s) && monthOf(s.date) === month);
  const revenue = sum(sales.map(saleTotal));
  const received = sum(sales.filter((s) => s.status === "pago").map(saleTotal));
  const pending = sum(sales.filter((s) => s.status === "pendente").map(saleTotal));
  const stockPurchases = sum(state.stockPurchases.filter((p) => monthOf(p.date) === month).map((p) => p.quantity * p.unitCost));
  const fees = revenue * state.settings.feePercent / 100;
  const expenses = sum(state.costs.filter((c) => monthOf(c.date) === month).map((c) => c.amount));
  // productCost mantém o nome usado pelo restante da aplicação, mas agora representa
  // o total comprado no mês, não apenas o custo das unidades vendidas.
  const productCost = stockPurchases;
  const profit = revenue - stockPurchases - fees - expenses;
  const cashBalance = received - stockPurchases - expenses - (received * state.settings.feePercent / 100);
  return {
    revenue, received, pending, units: sum(sales.map((s) => s.quantity)), salesCount: sales.length,
    productCost, fees, expenses, profit, margin: revenue > 0 ? profit / revenue * 100 : 0,
    ticket: sales.length > 0 ? revenue / sales.length : 0,
    stockPurchases, cashBalance, inventoryValue: inventoryValue(state),
  };
}
/** Valoriza o estoque pelo custo FIFO, respeitando a ordem cronológica de compras e vendas. */
export function inventoryValue(state: State) {
  const events = [
    ...state.stockPurchases.map((purchase) => ({ date: purchase.date, kind: "purchase" as const, quantity: purchase.quantity, unitCost: purchase.unitCost })),
    ...state.sales.filter(active).map((sale) => ({ date: sale.date, kind: "sale" as const, quantity: sale.quantity })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "purchase" ? -1 : 1));
  const lots: { quantity: number; unitCost: number }[] = [];
  for (const event of events) {
    if (event.kind === "purchase") {
      lots.push({ quantity: event.quantity, unitCost: event.unitCost });
      continue;
    }
    let remaining = event.quantity;
    for (const lot of lots) {
      const consumed = Math.min(lot.quantity, remaining);
      lot.quantity -= consumed;
      remaining -= consumed;
      if (remaining === 0) break;
    }
  }
  return sum(lots.map((lot) => lot.quantity * lot.unitCost));
}
export function goalFor(state: State, month: string) {
  const g = state.goals.find((x) => x.month === month);
  return { revenue: g?.revenue ?? state.settings.defaultRevenueGoal, units: g?.units ?? state.settings.defaultUnitsGoal, custom: Boolean(g) };
}
export const percent = (done: number, target: number) => target > 0 ? Math.round(done / target * 100) : 0;
/** Estoque disponível = placas compradas menos placas vendidas não canceladas. */
export function availableStock(state: State) { return state.settings.stock - sum(state.sales.filter(active).map((s) => s.quantity)); }
export function clientTotals(state: State, clientId: string) {
  const sales = state.sales.filter((s) => active(s) && s.clientId === clientId);
  const last = sales.map((s) => s.date).sort().at(-1) ?? "";
  return { total: sum(sales.map(saleTotal)), count: sales.length, last };
}
export function receivables(state: State) {
  return state.sales.filter((s) => s.status === "pendente").sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date));
}
export function topClients(state: State, month: string) {
  const map = new Map<string, { units: number; revenue: number }>();
  for (const s of state.sales) {
    if (!active(s) || monthOf(s.date) !== month || !s.clientId) continue;
    const cur = map.get(s.clientId) ?? { units: 0, revenue: 0 };
    map.set(s.clientId, { units: cur.units + s.quantity, revenue: cur.revenue + saleTotal(s) });
  }
  return [...map.entries()].map(([id, v]) => ({ id, name: state.clients.find((c) => c.id === id)?.name ?? "Cliente removido", ...v })).sort((a, b) => b.revenue - a.revenue);
}
