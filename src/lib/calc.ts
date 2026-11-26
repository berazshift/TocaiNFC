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
/** Lucro reconhece apenas o custo das unidades vendidas; compras de estoque afetam o caixa, não o lucro novamente. */
export function monthSummary(state: State, month: string): MonthSummary {
  const sales = state.sales.filter((s) => active(s) && monthOf(s.date) === month);
  const revenue = sum(sales.map(saleTotal));
  const productCost = sum(sales.map(saleCost));
  const fees = revenue * state.settings.feePercent / 100;
  const expenses = sum(state.costs.filter((c) => monthOf(c.date) === month).map((c) => c.amount));
  const profit = revenue - productCost - fees - expenses;
  const received = sum(sales.filter((s) => s.status === "pago").map(saleTotal));
  const stockPurchases = sum(state.stockPurchases.filter((p) => monthOf(p.date) === month).map((p) => p.quantity * p.unitCost));
  const cashBalance = received - stockPurchases - expenses - (received * state.settings.feePercent / 100);
  return {
    revenue, received, pending: sum(sales.filter((s) => s.status === "pendente").map(saleTotal)),
    units: sum(sales.map((s) => s.quantity)), salesCount: sales.length, productCost, fees, expenses,
    profit, margin: revenue > 0 ? profit / revenue * 100 : 0, ticket: sales.length > 0 ? revenue / sales.length : 0,
    stockPurchases, cashBalance, inventoryValue: inventoryValue(state),
  };
}
export function inventoryValue(state: State) {
  const lots = [...state.stockPurchases].sort((a, b) => a.date.localeCompare(b.date));
  let unitsToConsume = sum(state.sales.filter(active).map((s) => s.quantity));
  let value = 0;
  for (const lot of lots) {
    const remaining = Math.max(0, lot.quantity - unitsToConsume);
    value += remaining * lot.unitCost;
    unitsToConsume = Math.max(0, unitsToConsume - lot.quantity);
  }
  return value;
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
