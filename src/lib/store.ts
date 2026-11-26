import { useSyncExternalStore } from "react";

export type ClientStatus = "lead" | "negociando" | "cliente" | "inativo";
export type SaleStatus = "pago" | "pendente" | "cancelado";

export interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  status: ClientStatus;
  notes: string;
  nextContact: string;
  createdAt: string;
}
export interface Sale {
  id: string;
  date: string;
  clientId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  payment: string;
  status: SaleStatus;
  dueDate: string;
  notes: string;
}
export interface Cost {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}
export interface Goal {
  month: string;
  revenue: number;
  units: number;
}
export interface Settings {
  businessName: string;
  sellerName: string;
  feePercent: number;
  defaultRevenueGoal: number;
  defaultUnitsGoal: number;
  lowStock: number;
  unitPrice: number;
  unitCost: number;
  stock: number;
}
export interface State {
  settings: Settings;
  clients: Client[];
  sales: Sale[];
  costs: Cost[];
  goals: Goal[];
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: "Tocaai",
  sellerName: "",
  feePercent: 0,
  defaultRevenueGoal: 0,
  defaultUnitsGoal: 0,
  lowStock: 5,
  unitPrice: 0,
  unitCost: 0,
  stock: 0,
};

export const EMPTY: State = {
  settings: DEFAULT_SETTINGS,
  clients: [],
  sales: [],
  costs: [],
  goals: [],
};

const KEY = "tocaai:dados:v1";
let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

export function normalize(value: unknown): State {
  const o = (value && typeof value === "object" ? value : {}) as Partial<State>;
  const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    settings: { ...DEFAULT_SETTINGS, ...(o.settings ?? {}) },
    clients: list<Client>(o.clients),
    sales: list<Sale>(o.sales),
    costs: list<Cost>(o.costs),
    goals: list<Goal>(o.goals),
  };
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = normalize(JSON.parse(raw));
  } catch {
    // dados ilegíveis: começa vazio
  }
}

function getSnapshot() {
  load();
  return state;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function setState(fn: (s: State) => State) {
  load();
  state = fn(state);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sem espaço no aparelho
  }
  listeners.forEach((l) => l());
}

const noopSubscribe = () => () => {};

export function useData() {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return { state: data, ready };
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

type ListKey = "clients" | "sales" | "costs";

export function saveItem<K extends ListKey>(key: K, item: State[K][number]) {
  setState((s) => {
    const list = s[key] as { id: string }[];
    const next = list.some((i) => i.id === item.id)
      ? list.map((i) => (i.id === item.id ? item : i))
      : [item, ...list];
    return { ...s, [key]: next } as State;
  });
}

export function removeItem(key: ListKey, id: string) {
  setState((s) => ({ ...s, [key]: (s[key] as { id: string }[]).filter((i) => i.id !== id) }) as State);
}

export function saveGoal(goal: Goal) {
  setState((s) => ({ ...s, goals: [...s.goals.filter((g) => g.month !== goal.month), goal] }));
}

export function saveSettings(settings: Settings) {
  setState((s) => ({ ...s, settings }));
}

export function replaceAll(next: State) {
  setState(() => next);
}
