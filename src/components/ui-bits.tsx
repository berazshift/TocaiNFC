import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Trash2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { addMonths } from "@/lib/calc";
import { monthLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-primary/65">NFC Sales Hub <span className="px-1 text-border">/</span> Gestão comercial</div>
        <h1 className="text-[clamp(1.45rem,6vw,1.8rem)] font-bold leading-tight tracking-tight text-foreground md:text-[2.1rem]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, highlight = false }: { label: string; value: string; hint: string; icon: LucideIcon; highlight?: boolean }) {
  return (
    <div className={cn("card-surface group relative overflow-hidden p-5 md:p-5", highlight && "border-primary bg-primary text-primary-foreground")}>
      {highlight ? <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full border-[20px] border-white/[0.06]" /> : null}
      <div className="relative flex items-center justify-between gap-3">
        <span className={cn("text-[12px] font-semibold tracking-wide", highlight ? "text-primary-foreground/75" : "text-muted-foreground")}>{label}</span>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", highlight ? "bg-white/10 text-primary-foreground" : "bg-accent text-accent-foreground")}>
          <Icon className="size-[17px]" strokeWidth={2} />
        </span>
      </div>
      <div className="num relative mt-4 text-[clamp(1rem,4.2vw,1.8rem)] font-bold leading-tight tracking-tight md:text-[2rem]">{value}</div>
      <p className={cn("relative mt-2.5 text-[11px] leading-relaxed", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>{hint}</p>
    </div>
  );
}

export function Panel({ title, action, className, children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("card-surface min-w-0 p-5 md:p-6", className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold tracking-tight text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("grid content-start gap-2 text-[13px]", className)}>
      <span className="font-semibold text-foreground/90">{label}</span>
      {children}
      {hint ? <span className="text-[11px] leading-relaxed text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-[13px] shadow-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30";

export function NumberInput({ value, onChange, step = "0.01", placeholder }: { value: number; onChange: (n: number) => void; step?: string; placeholder?: string }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min="0"
      step={step}
      placeholder={placeholder ?? "0"}
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="h-10 rounded-xl bg-card text-[13px] shadow-sm"
    />
  );
}

export function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
      <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:text-foreground" aria-label="Mês anterior" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-36 text-center text-[12px] font-semibold capitalize text-foreground">{monthLabel(month)}</span>
      <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:text-foreground" aria-label="Próximo mês" onClick={() => onChange(addMonths(month, 1))}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

const tones = {
  success: "bg-success/10 text-success ring-1 ring-inset ring-success/15",
  warning: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/15",
  danger: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/15",
  muted: "bg-muted text-muted-foreground ring-1 ring-inset ring-border/70",
  primary: "bg-accent text-accent-foreground ring-1 ring-inset ring-primary/10",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide", tones[tone])}>{children}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/50">
      <div className={cn("h-full rounded-full transition-all duration-500", value >= 100 ? "bg-success" : "bg-primary")} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-primary/10 bg-accent text-accent-foreground shadow-sm">
        <Icon className="size-6" strokeWidth={1.8} />
      </span>
      <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{text}</p>
      {children ? <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function ConfirmDelete({ what, onConfirm, children }: { what: string; onConfirm: () => void; children?: ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Excluir">
            <Trash2 />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {what}?</AlertDialogTitle>
          <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden>
      <div className="h-3 w-40 rounded bg-muted" />
      <div className="h-9 w-64 rounded-lg bg-muted" />
      <div className="h-4 w-80 max-w-full rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl border border-border/60 bg-card" />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-border/60 bg-card" />
    </div>
  );
}
