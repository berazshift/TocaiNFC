import { describe, expect, it } from "vitest";
import { availableStock, monthSummary } from "./calc";
import { EMPTY, normalize, type Sale, type State } from "./store";
const sale = (over: Partial<Sale>): Sale => ({
  id: "s", date: "2026-11-10", clientId: "", quantity: 1, unitPrice: 100, unitCost: 40,
  discount: 0, payment: "Pix", status: "pago", dueDate: "", notes: "", ...over,
});
const state: State = {
  ...EMPTY,
  settings: { ...EMPTY.settings, feePercent: 10, unitPrice: 100, unitCost: 40, stock: 10 },
  stockPurchases: [{ id: "purchase", date: "2026-11-01", quantity: 10, unitCost: 40, description: "Estoque inicial" }],
  sales: [sale({ id: "a", quantity: 2, discount: 20 }), sale({ id: "b", status: "pendente" }), sale({ id: "c", quantity: 5, status: "cancelado" }), sale({ id: "d", date: "2026-10-30" })],
  costs: [{ id: "c1", date: "2026-11-02", description: "Frete", category: "Frete", amount: 30 }],
};
describe("contas do mês", () => {
  it("desconta o custo de todas as placas compradas no mês, inclusive as que ficaram em estoque", () => {
    const m = monthSummary(state, "2026-11");
    expect(m.revenue).toBe(280); expect(m.received).toBe(180); expect(m.pending).toBe(100);
    expect(m.units).toBe(3); expect(m.productCost).toBe(400); expect(m.profit).toBe(280 - 400 - 28 - 30);
  });
  it("separa compras de placas no caixa e calcula estoque remanescente", () => {
    const m = monthSummary(state, "2026-11");
    expect(m.stockPurchases).toBe(400);
    expect(m.cashBalance).toBe(180 - 400 - 30 - 18);
    expect(m.inventoryValue).toBe(280);
  });
  it("venda cancelada devolve a placa ao estoque", () => { expect(availableStock(state)).toBe(10 - 4); });
});
describe("normalização de dados importados", () => {
  it("migra estoque antigo para compra inicial uma única vez", () => {
    const normalized = normalize({ settings: { stock: 10, unitCost: 25 } });
    expect(normalized.stockPurchases).toEqual([{
      id: "legacy-stock-initial-2026-11", date: "2026-11-01", quantity: 10,
      unitCost: 25, description: "Estoque existente — lançamento inicial de novembro",
    }]);
    expect(normalize(normalized).stockPurchases).toHaveLength(1);
  });
  it("ignora registros inválidos e corrige valores fora do intervalo", () => {
    const normalized = normalize({
      settings: { feePercent: 140, stock: -4, unitPrice: Number.NaN },
      clients: [{ id: "c1", name: "Cliente" }, null, { name: "Sem ID" }],
      sales: [{ id: "s1", date: "2026-11-10", quantity: 2, unitPrice: 50, discount: 200 }, { id: "bad", date: "inválida" }],
      costs: [{ id: "x", date: "2026-11-01", amount: -10 }],
      goals: [{ month: "2026-11", revenue: -100, units: 4.8 }, { month: "2026-13", revenue: 100 }],
    });
    expect(normalized.settings.feePercent).toBe(100); expect(normalized.settings.stock).toBe(0);
    expect(normalized.clients).toHaveLength(1); expect(normalized.sales[0]?.discount).toBe(100);
    expect(normalized.costs[0]?.amount).toBe(0); expect(normalized.goals[0]?.units).toBe(4);
    expect(normalized.goals).toHaveLength(1);
  });
  it("aceita arquivo vazio ou malformado sem exceção", () => {
    expect(normalize(null)).toEqual(EMPTY);
    expect(normalize({ sales: "inválido", clients: {}, costs: null, goals: 4 }).sales).toEqual([]);
  });
});
