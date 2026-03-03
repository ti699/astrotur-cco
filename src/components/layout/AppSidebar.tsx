import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DoorOpen, Users, Settings, ChevronLeft, ChevronRight,
  Truck, Building2, UserCog, Wrench, Fuel, BarChart3, Menu, X, ShieldAlert,
  AlertTriangle, MapPin, FileInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import logoAstrotur from "@/assets/logo-astrotur.png";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
  roles: string[];
}

const allSections: NavSection[] = [
  {
    label: "",
    roles: ["administrador", "editor", "portaria"],
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Portaria", href: "/portaria", icon: DoorOpen },
    ],
  },
  {
    label: "Operacional",
    roles: ["administrador", "editor"],
    items: [
      { title: "Veiculos", href: "/cadastros/veiculos", icon: Truck },
      { title: "Motoristas", href: "/cadastros/motoristas", icon: Users },
      { title: "Manutencao", href: "/manutencao", icon: Wrench },
      { title: "Abastecimento", href: "/abastecimento", icon: Fuel },
    ],
  },
  {
    label: "Gestao",
    roles: ["administrador", "editor"],
    items: [
      { title: "Ocorrencias", href: "/ocorrencias", icon: AlertTriangle, badge: 3 },
      { title: "Avarias", href: "/avarias", icon: ShieldAlert },
      { title: "Clientes", href: "/cadastros/clientes", icon: Building2 },
      { title: "Relatorios", href: "/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Administracao",
    roles: ["administrador"],
    items: [
      { title: "Usuarios", href: "/cadastros/usuarios", icon: UserCog },
      { title: "Banco de Distancias", href: "/banco-distancias", icon: MapPin },
      { title: "Importacao", href: "/importacao", icon: FileInput },
      { title: "Configuracoes", href: "/configuracoes", icon: Settings },
    ],
  },
];

const sectionLabels: Record<string, string> = {
  Operacional: "Operacional",
  Gestao: "Gestao",
  Administracao: "Administracao",
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const role = user?.role || "portaria";

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const visibleSections = allSections.filter((s) => s.roles.includes(role));

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.href}
      to={item.href}
      onClick={() => setMobileOpen(false)}
      title={item.title}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-2" : "",
        isActive(item.href)
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.title}</span>
          {item.badge != null && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoAstrotur} alt="Grupo Astrotur" className="h-10 w-auto object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-sidebar-foreground">CCO</h1>
              <p className="text-xs text-sidebar-muted">Gestao de Frota</p>
            </div>
          </div>
        ) : (
          <img src={logoAstrotur} alt="Astrotur" className="h-8 w-auto mx-auto object-contain" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visibleSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.label && !collapsed && (
              <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                {section.label}
              </h3>
            )}
            {section.label && collapsed && si > 0 && (
              <div className="my-2 border-t border-sidebar-border" />
            )}
            <div className="space-y-0.5">
              {section.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2 flex-shrink-0">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-sidebar-muted uppercase tracking-wider">Perfil</p>
            <p className="text-sm font-medium text-sidebar-foreground">{user.nome}</p>
            <p className="text-xs text-sidebar-muted capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex mt-1 w-full items-center justify-center rounded-lg p-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground shadow-md"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-screen bg-sidebar flex flex-col shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 hidden lg:flex flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
