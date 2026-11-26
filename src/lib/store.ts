import { useSyncExternalStore } from "react";

export type ClientStatus = "lead" | "negociando" | "cliente" | "inativo";
export type SaleStatus = "pago" | "pendente" | "cancelado";

export interface Client {
  id: string; name: string; company: string; phone: string; email: string;
  city: string; status: ClientStatus; notes: string; nextContact: string; createdAt: string;
}
export interface Sale {
  id: string; date: string; clientId: string; quantity: number; unitPrice: number;
  unitCost: number; discount: number; payment: string; status: SaleStatus; dueDate: string; notes: string;
}
export interface Cost { id: string; date: string; description: string; category: string; amount: number; }
export interface StockPurchase {
  id: string; date: string; quantity: number; unitCost: number; description: string;
}
export interface Goal { month: string; revenue: number; units: number; }
export interface Settings {
  businessName: string; sellerName: string; feePercent: number; defaultRevenueGoal: number;
  defaultUnitsGoal: number; lowStock: number; unitPrice: number; unitCost: number; stock: number;
}
export interface State {
  settings: Settings; clients: Client[]; sales: Sale[]; costs: Cost[];
  stockPurchases: StockPurchase[]; goals: Goal[];
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: "Meu negócio", sellerName: "", feePercent: 0, defaultRevenueGoal: 0,
  defaultUnitsGoal: 0, lowStock: 5, unitPrice: 0, unitCost: 0, stock: 0,
};
export const EMPTY: State = {
  settings: DEFAULT_SETTINGS, clients: [], sales: [], costs: [], stockPurchases: [], goals: [],
};

const KEY = "tocaai:dados:v1";
let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
type RawKey = keyof State | keyof Settings | keyof Client | keyof Sale | keyof Cost | keyof StockPurchase | keyof Goal;
type UnknownRecord = Partial<Record<RawKey, unknown>>;
const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const number = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const validMonth = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export function normalize(value: unknown): State {
  const source = isRecord(value) ? value : {};
  const rawSettings = isRecord(source.settings) ? source.settings : {};
  const settings: Settings = {
    businessName: text(rawSettings.businessName, DEFAULT_SETTINGS.businessName),
    sellerName: text(rawSettings.sellerName),
    feePercent: Math.min(100, Math.max(0, number(rawSettings.feePercent))),
    defaultRevenueGoal: Math.max(0, number(rawSettings.defaultRevenueGoal)),
    defaultUnitsGoal: Math.max(0, Math.floor(number(rawSettings.defaultUnitsGoal))),
    lowStock: Math.max(0, Math.floor(number(rawSettings.lowStock, DEFAULT_SETTINGS.lowStock))),
    unitPrice: Math.max(0, number(rawSettings.unitPrice)),
    unitCost: Math.max(0, number(rawSettings.unitCost)),
    stock: Math.max(0, Math.floor(number(rawSettings.stock))),
  };
  const clients: Client[] = (Array.isArray(source.clients) ? source.clients : [])
    .filter((item): item is UnknownRecord => isRecord(item) && typeof item.id === "string" && typeof item.name === "string")
    .map((item) => ({
      id: text(item.id), name: text(item.name), company: text(item.company), phone: text(item.phone),
      email: text(item.email), city: text(item.city),
      status: (["lead", "negociando", "cliente", "inativo"] as const).includes(item.status as ClientStatus) ? item.status as ClientStatus : "lead",
      notes: text(item.notes), nextContact: validDate(item.nextContact) ? item.nextContact : "",
      createdAt: validDate(item.createdAt) ? item.createdAt : "",
    }));
  const sales: Sale[] = (Array.isArray(source.sales) ? source.sales : [])
    .filter((item): item is UnknownRecord => isRecord(item) && typeof item.id === "string" && validDate(item.date))
    .map((item) => {
      const quantity = Math.max(1, Math.floor(number(item.quantity, 1)));
      const unitPrice = Math.max(0, number(item.unitPrice, settings.unitPrice));
      return {
        id: text(item.id), date: text(item.date), clientId: text(item.clientId), quantity, unitPrice,
        unitCost: Math.max(0, number(item.unitCost, settings.unitCost)),
        discount: Math.min(quantity * unitPrice, Math.max(0, number(item.discount))),
        payment: text(item.payment, "Pix"),
        status: (["pago", "pendente", "cancelado"] as const).includes(item.status as SaleStatus) ? item.status as SaleStatus : "pago",
        dueDate: validDate(item.dueDate) ? item.dueDate : "", notes: text(item.notes),
      };
    });
  const costs: Cost[] = (Array.isArray(source.costs) ? source.costs : [])
    .filter((item): item is UnknownRecord => isRecord(item) && typeof item.id === "string" && validDate(item.date))
    .map((item) => ({
      id: text(item.id), date: text(item.date), description: text(item.description),
      category: text(item.category, "Outros"), amount: Math.max(0, number(item.amount)),
    }));
  const stockPurchases: StockPurchase[] = Array.isArray(source.stockPurchases)
    ? source.stockPurchases
        .filter((item): item is UnknownRecord => isRecord(item) && typeof item.id === "string" && validDate(item.date))
        .map((item) => ({
          id: text(item.id), date: text(item.date), quantity: Math.max(0, Math.floor(number(item.quantity))),
          unitCost: Math.max(0, number(item.unitCost, settings.unitCost)),
          description: text(item.description, "Compra de placas"),
        }))
        .filter((item) => item.quantity > 0)
    : settings.stock > 0
      ? [{ id: "legacy-stock-initial-2026-11", date: "2026-11-01", quantity: settings.stock, unitCost: settings.unitCost, description: "Estoque existente — lançamento inicial de novembro" }]
      : [];
  const goals: Goal[] = (Array.isArray(source.goals) ? source.goals : [])
    .filter((item): item is UnknownRecord => isRecord(item) && validMonth(item.month))
    .map((item) => ({
      month: text(item.month), revenue: Math.max(0, number(item.revenue)),
      units: Math.max(0, Math.floor(number(item.units))),
    }));
  return { settings, clients, sales, costs, stockPurchases, goals };
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      state = normalize(JSON.parse(raw));
      window.localStorage.setItem(KEY, JSON.stringify(state));
    }
  } catch { state = EMPTY; }
}
function getSnapshot() { load(); return state; }
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    loaded = false; load(); cb();
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}
export function setState(fn: (s: State) => State) {
  load(); state = normalize(fn(state));
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* export backup if storage is unavailable */ }
  listeners.forEach((l) => l());
}
const noopSubscribe = () => () => {};
export function useData() {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return { state: data, ready };
}
export const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
type ListKey = "clients" | "sales" | "costs";
export function saveItem<K extends ListKey>(key: K, item: State[K][number]) {
  setState((s) => {
    const list = s[key] as { id: string }[];
    const next = list.some((i) => i.id === item.id) ? list.map((i) => i.id === item.id ? item : i) : [item, ...list];
    return { ...s, [key]: next } as State;
  });
}
export function removeItem(key: ListKey, id: string) {
  setState((s) => ({ ...s, [key]: (s[key] as { id: string }[]).filter((i) => i.id !== id) }) as State);
}
export function saveStockPurchase(purchase: StockPurchase) {
  setState((s) => ({
    ...s,
    settings: { ...s.settings, stock: s.settings.stock + purchase.quantity },
    stockPurchases: [purchase, ...s.stockPurchases],
  }));
}
export function saveGoal(goal: Goal) {
  setState((s) => ({ ...s, goals: [...s.goals.filter((g) => g.month !== goal.month), goal] }));
}
export function saveSettings(settings: Settings) { setState((s) => ({ ...s, settings })); }
export function replaceAll(next: State) { setState(() => next); }
