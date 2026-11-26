import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, BarChart3, Calculator, CalendarDays, LayoutDashboard, Plus, Receipt, Settings, Target, Users, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useData } from "@/lib/store";

const items = [
  { title: "Visão geral", to: "/", icon: LayoutDashboard },
  { title: "Vendas", to: "/vendas", icon: Receipt },
  { title: "Clientes", to: "/clientes", icon: Users },
  { title: "Metas", to: "/metas", icon: Target },
  { title: "Simulador de vendas", to: "/simulador", icon: Calculator },
  { title: "Custos", to: "/custos", icon: Wallet },
  { title: "Configurações", to: "/configuracoes", icon: Settings },
] as const;


const pageNames: Record<string, string> = {
  "/": "Visão geral",
  "/vendas": "Vendas",
  "/clientes": "Clientes",
  "/metas": "Metas",
  "/simulador": "Simulador de vendas",
  "/custos": "Custos",
  "/configuracoes": "Configurações",
};

function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useData();

  return (
    <Sidebar collapsible="offcanvas" className="border-r-0">
      <SidebarHeader className="px-4 pb-7 pt-6">
        <Link to="/" onClick={() => setOpenMobile(false)} className="block w-fit rounded-xl" aria-label="TocaiNFC — Visão geral">
          <img src="/tocainfc-logo.svg" alt="TocaiNFC" width={171} height={44} className="h-11 w-auto" />
        </Link>
        <div className="-mt-2 pl-[58px] text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">Sales workspace</div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">Menu principal</div>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={path === item.to}
                    tooltip={item.title}
                    className="h-11 rounded-xl px-3 text-[13px] font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-primary data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-md data-[active=true]:shadow-black/10"
                  >
                    <Link to={item.to} onClick={() => setOpenMobile(false)}>
                      <item.icon className="size-[18px]" strokeWidth={1.9} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto mb-4 rounded-2xl border border-white/10 bg-white/[0.045] p-3 group-data-[collapsible=icon]:hidden">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/90"><BarChart3 className="size-4 text-sidebar-primary" /> Seu negócio</div>
          <p className="truncate text-xs text-sidebar-foreground/55">{state.settings.businessName || "Configure seu negócio"}</p>
          <Link to="/configuracoes" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-sidebar-primary hover:underline" onClick={() => setOpenMobile(false)}>
            Ajustar informações <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useData();
  const seller = state.settings.sellerName || "Vendedor";
  const initials = seller.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger aria-label="Abrir ou fechar o menu" className="rounded-lg" />
              <div className="hidden h-7 w-px bg-border sm:block" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">{pageNames[path] ?? "TocaiNFC"}</p>
                <p className="hidden text-[11px] text-muted-foreground sm:block">Central de gestão comercial</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-xs font-medium text-muted-foreground md:flex">
                <CalendarDays className="size-3.5" />
                {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date())}
              </div>
              <Button asChild size="sm" className="h-9 rounded-lg px-3 shadow-sm">
                <Link to="/vendas"><Plus className="size-4" /> <span className="hidden sm:inline">Registrar venda</span><span className="sm:hidden">Nova venda</span></Link>
              </Button>
              <div className="hidden size-9 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-xs font-bold text-primary sm:flex" title={seller}>{initials || "VS"}</div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 pb-6 md:px-8 md:py-8 xl:px-10">{children}</main>
          <footer className="hidden flex-wrap items-center justify-between gap-2 border-t border-border/70 px-6 py-4 text-[11px] text-muted-foreground md:flex md:px-10">
            <span>TocaiNFC <span className="text-border">·</span> Gestão comercial</span>
            <span>Organização para vender melhor, todos os dias.</span>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
