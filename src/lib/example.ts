import { addDays, addMonths, currentMonth, daysInMonth, todayISO } from "./calc";
import { type Client, type Cost, type Sale, type State, uid } from "./store";

/** Dados fictícios para o vendedor conhecer o painel antes de lançar os seus. */
export function buildExample(): State {
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;
  const today = todayISO();
  const month = currentMonth();
  const pad = (n: number) => String(n).padStart(2, "0");

  const base: [string, string, string, Client["status"]][] = [
    ["Marina Lopes", "Café Aurora", "Curitiba", "cliente"],
    ["Rafael Teixeira", "Barbearia Navalha", "Curitiba", "cliente"],
    ["Juliana Prado", "Studio Pilates JP", "São José dos Pinhais", "cliente"],
    ["Diego Martins", "Pizzaria Forno 8", "Curitiba", "cliente"],
    ["Camila Souza", "Clínica Sorriso", "Pinhais", "negociando"],
    ["Bruno Almeida", "Pet Shop Patas", "Curitiba", "negociando"],
    ["Larissa Nunes", "Ateliê Linho", "Colombo", "lead"],
    ["Thiago Rocha", "Hamburgueria Brasa", "Curitiba", "lead"],
  ];
  const clients: Client[] = base.map(([name, company, city, status], i) => ({
    id: uid(),
    name,
    company,
    phone: `4199${pad(10 + i)}${pad(20 + i * 3)}${pad(11 + i)}`,
    email: "",
    city,
    status,
    notes: "",
    nextContact: status === "cliente" ? (i % 2 ? addDays(today, 12 + i) : "") : addDays(today, i - 5),
    createdAt: addDays(today, -150 + i * 12),
  }));
  const buyers = clients.filter((c) => c.status === "cliente");

  const sales: Sale[] = [];
  const costs: Cost[] = [];
  for (let back = 5; back >= 0; back--) {
    const m = addMonths(month, -back);
    const lastDay = back === 0 ? Number(today.slice(8, 10)) : daysInMonth(m);
    const count = 7 + Math.floor(rand() * 6) + (5 - back);
    for (let i = 0; i < count; i++) {
      const date = `${m}-${pad(1 + Math.floor(rand() * lastDay))}`;
      const pending = back === 0 && rand() < 0.3;
      sales.push({
        id: uid(),
        date,
        clientId: rand() < 0.85 ? pick(buyers).id : "",
        quantity: pick([1, 1, 2, 2, 3, 5, 8]),
        unitPrice: 89.9,
        unitCost: 32,
        discount: rand() < 0.2 ? 10 : 0,
        payment: pick(["Pix", "Pix", "Cartão", "Dinheiro"]),
        status: pending ? "pendente" : "pago",
        dueDate: pending ? addDays(date, 7) : "",
        notes: "",
      });
    }
    costs.push(
      { id: uid(), date: `${m}-05`, description: "Anúncios no Instagram", category: "Anúncios", amount: 220 + Math.round(rand() * 80) },
      { id: uid(), date: `${m}-0${1 + Math.floor(rand() * 8)}`, description: "Envios do mês", category: "Frete", amount: 90 + Math.round(rand() * 60) },
      { id: uid(), date: `${m}-03`, description: "Caixas e adesivos", category: "Embalagem", amount: 75 },
    );
  }
  sales.sort((a, b) => b.date.localeCompare(a.date));

  return {
    settings: {
      businessName: "Meu negócio",
      sellerName: "",
      feePercent: 3,
      defaultRevenueGoal: 5000,
      defaultUnitsGoal: 55,
      lowStock: 30,
      unitPrice: 89.9,
      unitCost: 32,
      stock: 400,
    },
    clients,
    sales,
    costs,
    stockPurchases: [{ id: uid(), date: `${addMonths(month, -5)}-01`, quantity: 400, unitCost: 32, description: "Estoque inicial de exemplo" }],
    goals: [],
  };
}
