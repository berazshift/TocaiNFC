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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, highlight = false }: { label: string; value: string; hint: string; icon: LucideIcon; highlight?: boolean }) {
  return (
    <div className={cn("card-surface p-5", highlight && "border-primary bg-primary text-primary-foreground")}>
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", highlight ? "text-primary-foreground/80" : "text-muted-foreground")}>{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", highlight ? "bg-signal text-signal-foreground" : "bg-accent text-accent-foreground")}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="num mt-3 text-3xl font-semibold">{value}</div>
      <p className={cn("mt-1 text-xs", highlight ? "text-primary-foreground/75" : "text-muted-foreground")}>{hint}</p>
    </div>
  );
}

export function Panel({ title, action, className, children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("card-surface p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("grid content-start gap-1.5 text-sm", className)}>
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring";

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
    />
  );
}

export function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      <Button variant="ghost" size="icon" className="size-7" aria-label="Mês anterior" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeft />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium first-letter:uppercase">{monthLabel(month)}</span>
      <Button variant="ghost" size="icon" className="size-7" aria-label="Próximo mês" onClick={() => onChange(addMonths(month, 1))}>
        <ChevronRight />
      </Button>
    </div>
  );
}

const tones = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/12 text-destructive",
  muted: "bg-muted text-muted-foreground",
  primary: "bg-accent text-accent-foreground",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", value >= 100 ? "bg-success" : "bg-primary")} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
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
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-9 w-56 rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-muted" />
    </div>
  );
}
