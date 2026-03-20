import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Filter } from "lucide-react";

interface FiltroEntradasProps {
  filtros: any;
  setFiltros: (f: any) => void;
  opcoesStatus: string[];
  opcoesClientes: string[];
  opcoesMonitores: string[];
  totalResultados: number;
  onLimpar: () => void;
}

export function FiltroEntradasCompacto({ filtros, setFiltros, opcoesStatus, opcoesClientes, opcoesMonitores, totalResultados, onLimpar }: FiltroEntradasProps) {
  const [showClientes, setShowClientes] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showMonitores, setShowMonitores] = useState(false);
  const atalhos = [
    { label: "Hoje", range: [new Date(), new Date()] },
    { label: "Ontem", range: [new Date(Date.now()-86400000), new Date(Date.now()-86400000)] },
    { label: "Últimos 7 dias", range: [new Date(Date.now()-86400000*6), new Date()] },
    { label: "Últimos 30 dias", range: [new Date(Date.now()-86400000*29), new Date()] },
    { label: "Este mês", range: [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()] },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center w-full mb-2">
      {/* Busca texto */}
      <div className="relative flex-1 min-w-[180px]">
        <Input placeholder="Buscar por veículo, motorista..." className="pl-10" value={filtros.busca || ""} onChange={e => setFiltros((f: any) => ({ ...f, busca: e.target.value }))} />
        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {/* Data Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            {filtros.dataDe ? filtros.dataDe.toLocaleDateString("pt-BR") : "De"} - {filtros.dataAte ? filtros.dataAte.toLocaleDateString("pt-BR") : "Até"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto flex gap-2">
          <Calendar
            mode="range"
            selected={{ from: filtros.dataDe, to: filtros.dataAte }}
            onSelect={({ from, to }) => setFiltros((f: any) => ({ ...f, dataDe: from, dataAte: to }))}
          />
          <div className="flex flex-col gap-1">
            {atalhos.map(a => (
              <Button key={a.label} variant="ghost" size="sm" onClick={() => setFiltros((f: any) => ({ ...f, dataDe: a.range[0], dataAte: a.range[1] }))}>{a.label}</Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {/* Status */}
      <Popover open={showStatus} onOpenChange={setShowStatus}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            Status {filtros.status?.length > 0 && filtros.status.map((s: string) => <Badge key={s} className="ml-1 bg-blue-100 text-blue-800">{s}<X className="h-3 w-3 cursor-pointer ml-1" onClick={e => { e.stopPropagation(); setFiltros((f: any) => ({ ...f, status: f.status.filter((x: string) => x !== s) }))}} /></Badge>)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          {opcoesStatus.map(status => (
            <div key={status} className="flex items-center gap-2 mb-1">
              <Checkbox checked={filtros.status?.includes(status)} onCheckedChange={v => {
                setFiltros((f: any) => {
                  const atual = f.status || [];
                  return { ...f, status: atual.includes(status) ? atual.filter((s: string) => s !== status) : [...atual, status] };
                });
              }} />
              <span>{status}</span>
            </div>
          ))}
          <Button variant="ghost" size="xs" onClick={() => setFiltros((f: any) => ({ ...f, status: [] }))}>Limpar</Button>
        </PopoverContent>
      </Popover>
      {/* Cliente */}
      <Popover open={showClientes} onOpenChange={setShowClientes}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            Cliente {filtros.clientes?.length > 0 && filtros.clientes.map((c: string) => <Badge key={c} className="ml-1 bg-green-100 text-green-800">{c}<X className="h-3 w-3 cursor-pointer ml-1" onClick={e => { e.stopPropagation(); setFiltros((f: any) => ({ ...f, clientes: f.clientes.filter((x: string) => x !== c) }))}} /></Badge>)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <Input placeholder="Buscar cliente..." value={filtros.buscaCliente || ""} onChange={e => setFiltros((f: any) => ({ ...f, buscaCliente: e.target.value }))} className="mb-2" />
          {opcoesClientes.filter(c => !filtros.buscaCliente || c.toLowerCase().includes(filtros.buscaCliente.toLowerCase())).map(cliente => (
            <div key={cliente} className="flex items-center gap-2 mb-1">
              <Checkbox checked={filtros.clientes?.includes(cliente)} onCheckedChange={v => {
                setFiltros((f: any) => {
                  const atual = f.clientes || [];
                  return { ...f, clientes: atual.includes(cliente) ? atual.filter((s: string) => s !== cliente) : [...atual, cliente] };
                });
              }} />
              <span>{cliente}</span>
            </div>
          ))}
          <Button variant="ghost" size="xs" onClick={() => setFiltros((f: any) => ({ ...f, clientes: [] }))}>Limpar</Button>
        </PopoverContent>
      </Popover>
      {/* Monitor */}
      <Popover open={showMonitores} onOpenChange={setShowMonitores}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            Monitor {filtros.monitores?.length > 0 && filtros.monitores.map((m: string) => <Badge key={m} className="ml-1 bg-purple-100 text-purple-800">{m}<X className="h-3 w-3 cursor-pointer ml-1" onClick={e => { e.stopPropagation(); setFiltros((f: any) => ({ ...f, monitores: f.monitores.filter((x: string) => x !== m) }))}} /></Badge>)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          {opcoesMonitores.map(monitor => (
            <div key={monitor} className="flex items-center gap-2 mb-1">
              <Checkbox checked={filtros.monitores?.includes(monitor)} onCheckedChange={v => {
                setFiltros((f: any) => {
                  const atual = f.monitores || [];
                  return { ...f, monitores: atual.includes(monitor) ? atual.filter((s: string) => s !== monitor) : [...atual, monitor] };
                });
              }} />
              <span>{monitor}</span>
            </div>
          ))}
          <Button variant="ghost" size="xs" onClick={() => setFiltros((f: any) => ({ ...f, monitores: [] }))}>Limpar</Button>
        </PopoverContent>
      </Popover>
      {/* Botões */}
      <Button variant="outline" size="sm" onClick={onLimpar}>Limpar Filtros</Button>
      <span className="ml-auto text-muted-foreground text-xs">Exibindo {totalResultados} registros</span>
    </div>
  );
}
