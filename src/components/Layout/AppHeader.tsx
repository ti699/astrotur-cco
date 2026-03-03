import { useState } from "react";
import { Bell, Search, User, LogOut, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FinalizarPlantaoDialog } from "@/components/plantao/FinalizarPlantaoDialog";
import { useAuth } from "@/contexts/AuthContext";
import logoAstrotur from "@/assets/logo-astrotur.png";

export function AppHeader() {
  const [finalizarPlantaoOpen, setFinalizarPlantaoOpen] = useState(false);
  const { user } = useAuth();
  const pendenciasCount = 2;

  const notifications = [
    { id: 1, title: "Nova avaria registrada", time: "5 min", urgent: true },
    { id: 2, title: "Veículo retornou do abastecimento", time: "15 min", urgent: false },
    { id: 3, title: "Manutenção concluída #2536", time: "1h", urgent: false },
  ];

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      {/* Mobile: logo + spacer */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-10" /> {/* spacer for hamburger */}
        <img src={logoAstrotur} alt="Astrotur" className="h-8 w-auto" />
      </div>

      {/* Search - hidden on mobile */}
      <div className="hidden sm:flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Buscar veículo, motorista..." className="pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden md:flex items-center gap-4 mr-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">42</span> ativos</span>
          </div>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" onClick={() => setFinalizarPlantaoOpen(true)}>
                <ClipboardCheck className={`h-5 w-5 ${pendenciasCount > 0 ? "text-amber-500" : "text-green-500"}`} />
                {pendenciasCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center bg-amber-500 text-white text-[10px]">{pendenciasCount}</Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Finalizar Plantão</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <FinalizarPlantaoDialog open={finalizarPlantaoOpen} onOpenChange={setFinalizarPlantaoOpen} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs">3</Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex items-start gap-3 p-3">
                <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.urgent ? "bg-destructive" : "bg-primary"}`} />
                <div className="flex-1"><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.time} atrás</p></div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {user?.nome?.charAt(0) || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">{user?.nome || "Usuário"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || "—"}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><User className="mr-2 h-4 w-4" />Perfil</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
