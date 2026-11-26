import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Nfc, Plus, Receipt, Settings, Target, Users, Wallet } from "lucide-react";

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
  { title: "Custos", to: "/custos", icon: Wallet },
  { title: "Configurações", to: "/configuracoes", icon: Settings },
] as const;

function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useData();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Nfc className="size-4" />
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate font-display text-lg font-semibold leading-tight">{state.settings.businessName || "Tocaai"}</div>
            <div className="text-xs text-sidebar-foreground/60">Vendas de placas NFC</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={path === item.to} tooltip={item.title} className="h-10 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground">
                    <Link to={item.to} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur">
            <SidebarTrigger aria-label="Abrir ou fechar o menu" />
            <Button asChild size="sm">
              <Link to="/vendas">
                <Plus /> Registrar venda
              </Link>
            </Button>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
