import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDelete, Field, NumberInput, PageHeader, PageSkeleton, Panel } from "@/components/ui-bits";
import { availableStock, todayISO } from "@/lib/calc";
import { buildExample } from "@/lib/example";
import { brl } from "@/lib/format";
import { EMPTY, normalize, replaceAll, saveSettings, useData, type Settings, type State } from "@/lib/store";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Tocaai" },
      { name: "description", content: "Preço, custo e estoque da placa NFC, taxas, meta padrão e cópia de segurança dos seus dados." },
      { property: "og:title", content: "Configurações — Tocaai" },
      { property: "og:description", content: "Preço, custo e estoque da placa NFC, taxas, meta padrão e cópia de segurança dos seus dados." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, ready } = useData();
  if (!ready) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Configurações" description="Os números da sua placa e os ajustes do painel." />
      <div className="grid gap-4 lg:grid-cols-3">
        <SettingsForm key={JSON.stringify(state.settings)} state={state} />
        <Backup state={state} />
      </div>
    </>
  );
}

function SettingsForm({ state }: { state: State }) {
  const [s, setS] = useState<Settings>(state.settings);
  const set = (patch: Partial<Settings>) => setS((v) => ({ ...v, ...patch }));
  const sold = state.settings.stock - availableStock(state);
  const perPlate = s.unitPrice - s.unitCost - (s.unitPrice * s.feePercent) / 100;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    saveSettings({ ...s, businessName: s.businessName.trim() || "Tocaai" });
    toast.success("Configurações salvas.");
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:col-span-2">
      <Panel title="Sua placa NFC">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Preço de venda (R$)" hint="Já vem preenchido em cada venda nova."><NumberInput value={s.unitPrice} onChange={(unitPrice) => set({ unitPrice })} /></Field>
          <Field label="Custo por placa (R$)" hint="Quanto você paga em cada uma."><NumberInput value={s.unitCost} onChange={(unitCost) => set({ unitCost })} /></Field>
          <Field label="Taxas sobre a venda (%)" hint="Maquininha, imposto, comissão."><NumberInput value={s.feePercent} onChange={(feePercent) => set({ feePercent })} /></Field>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-accent px-4 py-3 text-accent-foreground">
          <span className="text-sm font-medium">Você ganha por placa</span>
          <span className="num text-xl font-semibold">{brl(perPlate)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Mudar o preço ou o custo vale para as próximas vendas; as já lançadas ficam como estão.</p>
      </Panel>

      <Panel title="Estoque">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Placas compradas no total" hint="Some aqui sempre que repor."><NumberInput step="1" value={s.stock} onChange={(stock) => set({ stock })} /></Field>
          <Field label="Avisar quando restarem"><NumberInput step="1" value={s.lowStock} onChange={(lowStock) => set({ lowStock })} /></Field>
          <div className="text-sm">
            <div className="font-medium">Disponível agora</div>
            <div className="num mt-1.5 text-2xl font-semibold">{s.stock - sold}</div>
            <div className="text-xs text-muted-foreground">{sold} já vendidas</div>
          </div>
        </div>
      </Panel>

      <Panel title="Você e suas metas">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do negócio" hint="Aparece no topo do menu."><Input value={s.businessName} onChange={(e) => set({ businessName: e.target.value })} /></Field>
          <Field label="Seu nome"><Input value={s.sellerName} onChange={(e) => set({ sellerName: e.target.value })} /></Field>
          <Field label="Meta padrão de faturamento (R$)" hint="Usada nos meses sem meta própria."><NumberInput value={s.defaultRevenueGoal} onChange={(defaultRevenueGoal) => set({ defaultRevenueGoal })} /></Field>
          <Field label="Meta padrão de placas por mês"><NumberInput step="1" value={s.defaultUnitsGoal} onChange={(defaultUnitsGoal) => set({ defaultUnitsGoal })} /></Field>
        </div>
      </Panel>

      <div><Button type="submit" size="lg">Salvar configurações</Button></div>
    </form>
  );
}

function Backup({ state }: { state: State }) {
  const input = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tocaai-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !("sales" in parsed)) throw new Error("formato");
      replaceAll(normalize(parsed));
      toast.success("Cópia restaurada.");
    } catch {
      toast.error("Esse arquivo não é uma cópia do Tocaai.");
    }
  };

  return (
    <Panel title="Seus dados" className="h-fit">
      <p className="text-sm text-muted-foreground">Tudo fica guardado só neste aparelho e navegador. Baixe uma cópia de vez em quando para não perder nada.</p>
      <div className="mt-4 grid gap-2">
        <Button variant="outline" onClick={exportData}><Download /> Baixar cópia de segurança</Button>
        <Button variant="outline" onClick={() => input.current?.click()}><Upload /> Restaurar uma cópia</Button>
        <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
        {state.sales.length === 0 && state.clients.length === 0 ? (
          <Button variant="outline" onClick={() => { replaceAll(buildExample()); toast.success("Dados de exemplo carregados."); }}><Sparkles /> Carregar dados de exemplo</Button>
        ) : null}
        <ConfirmDelete what="todos os dados" onConfirm={() => { replaceAll(EMPTY); toast.success("Tudo apagado."); }}>
          <Button variant="ghost" className="text-destructive hover:text-destructive"><Trash2 /> Apagar tudo</Button>
        </ConfirmDelete>
      </div>
    </Panel>
  );
}
