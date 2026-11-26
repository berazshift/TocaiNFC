import { describe, expect, it } from "vitest";
import { availableStock, monthSummary } from "./calc";
import { EMPTY, type Sale, type State } from "./store";

const sale = (over: Partial<Sale>): Sale => ({
  id: "s", date: "2026-11-10", clientId: "", quantity: 1, unitPrice: 100, unitCost: 40,
  discount: 0, payment: "Pix", status: "pago", dueDate: "", notes: "", ...over,
});

const state: State = {
  ...EMPTY,
  settings: { ...EMPTY.settings, feePercent: 10, unitPrice: 100, unitCost: 40, stock: 10 },
  sales: [
    sale({ id: "a", quantity: 2, discount: 20 }),
    sale({ id: "b", status: "pendente" }),
    sale({ id: "c", quantity: 5, status: "cancelado" }),
    sale({ id: "d", date: "2026-10-30" }),
  ],
  costs: [{ id: "c1", date: "2026-11-02", description: "Frete", category: "Frete", amount: 30 }],
};

describe("contas do mês", () => {
  it("lucro = faturamento − custo das placas − taxas − despesas, sem canceladas", () => {
    const m = monthSummary(state, "2026-11");
    expect(m.revenue).toBe(280);
    expect(m.received).toBe(180);
    expect(m.pending).toBe(100);
    expect(m.units).toBe(3);
    expect(m.profit).toBe(280 - 120 - 28 - 30);
  });

  it("venda cancelada devolve a placa ao estoque", () => {
    expect(availableStock(state)).toBe(10 - 4);
  });
});
