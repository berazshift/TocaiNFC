const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (n: number) => money.format(Number.isFinite(n) ? n : 0);

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthLabel(month: string, short = false) {
  const [y = "", m = "1"] = month.split("-");
  const name = MONTHS[Number(m) - 1] ?? "";
  return short ? `${name.slice(0, 3)}/${y.slice(2)}` : `${name} de ${y}`;
}

export function dateLabel(date: string) {
  if (!date) return "—";
  const [y = "", m = "", d = ""] = date.split("-");
  return `${d}/${m}/${y}`;
}
