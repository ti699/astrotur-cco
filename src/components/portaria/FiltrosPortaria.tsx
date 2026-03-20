import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Filter } from "lucide-react";

interface FiltrosProps {
  filtros: any;
  setFiltros: (f: any) => void;
  opcoesStatus: string[];
  opcoesClientes: string[];
  opcoesMonitores: string[];
  onAplicar: () => void;
  onLimpar: () => void;
  totalResultados: number;
}

export function FiltrosPortaria({ filtros, setFiltros, opcoesStatus, opcoesClientes, opcoesMonitores, onAplicar, onLimpar, totalResultados }: FiltrosProps) {
  const [colapsado, setColapsado] = useState(true);
  // Atalhos de datas
  const atalhos = [
    { label: "Hoje", range: [new Date(), new Date()] },
    { label: "Ontem", range: [new Date(Date.now()-86400000), new Date(Date.now()-86400000)] },
    { label: "Últimos 7 dias", range: [new Date(Date.now()-86400000*6), new Date()] },
    { label: "Últimos 30 dias", range: [new Date(Date.now()-86400000*29), new Date()] },
    { label: "Este mês", range: [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()] },
  ];

  return (
    <div className="mb-2">
      <Button variant="outline" size="sm" className="mb-2" onClick={() => setColapsado(v => !v)}>
        <Filter className="mr-2 h-4 w-4" />Filtros {colapsado ? "(mostrar)" : "(ocultar)"}
      </Button>
      {!colapsado && (
        <div className="bg-muted rounded-lg p-3 flex flex-col gap-3 border border-muted-foreground/10">
          {/* Data Range */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-semibold">📅 Data:</span>
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
          </div>
          {/* Status */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-semibold">🔖 Status:</span>
            {opcoesStatus.map(status => (
              <Checkbox key={status} checked={filtros.status?.includes(status)} onCheckedChange={v => {
                setFiltros((f: any) => {
                  const atual = f.status || [];
                  return { ...f, status: atual.includes(status) ? atual.filter((s: string) => s !== status) : [...atual, status] };
                });
              }} />
            ))}
            {filtros.status?.length > 0 && filtros.status.map((s: string) => (
              <Badge key={s} className="ml-1 bg-blue-100 text-blue-800 flex items-center gap-1">{s}<X className="h-3 w-3 cursor-pointer" onClick={() => setFiltros((f: any) => ({ ...f, status: f.status.filter((x: string) => x !== s) }))} /></Badge>
            ))}
            <Button variant="ghost" size="xs" onClick={() => setFiltros((f: any) => ({ ...f, status: [] }))}>Limpar</Button>
          </div>
          {/* Cliente */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-semibold">👤 Cliente:</span>
            <Input placeholder="Buscar cliente..." value={filtros.buscaCliente || ""} onChange={e => setFiltros((f: any) => ({ ...f, buscaCliente: e.target.value }))} className="w-32" />
            {opcoesClientes.filter(c => !filtros.buscaCliente || c.toLowerCase().includes(filtros.buscaCliente.toLowerCase())).map(cliente => (
              <Checkbox key={cliente} checked={filtros.clientes?.includes(cliente)} onCheckedChange={v => {
                setFiltros((f: any) => {
                  const atual = f.clientes || [];
                  return { ...f, clientes: atual.includes(cliente) ? atual.filter((s: string) => s !== cliente) : [...atual, cliente] };
                });
              }} />
            ))}
            {filtros.clientes?.length > 0 && filtros.clientes.map((c: string) => (
              <Badge key={c} className="ml-1 bg-green-100 text-green-800 flex items-center gap-1">{c}<X className="h-3 w-3 cursor-pointer" onClick={() => setFiltros((f: any) => ({ ...f, clientes: f.clientes.filter((x: string) => x !== c) }))} /></Badge>
            ))}
            <Button variant="ghost" size="xs" onClick={() => setFiltros((f: any) => ({ ...f, clientes: [] }))}>Limpar</Button>
          </div>
          {/* Monitor */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-semibold">🖥️ Monitor:</span>
            {opcoesMonitores.map(monitor => (
              <Checkbox key={monitor} checked={filtros.monitores?.includes(monitor)} onCheckedChange={v => {
                setFiltros((f: any) => {
                  const atual = f.monitores || [];
                  return { ...f, monitores: atual.includes(monitor) ? atual.filter((s: string) => s !== monitor) : [...atual, monitor] };
                });
              }} />
            ))}
            {filtros.monitores?.length > 0 && filtros.monitores.map((m: string) => (
              <Badge key={m} className="ml-1 bg-purple-100 text-purple-800 flex items-center gap-1">{m}<X className="h-3 w-3 cursor-pointer" onClick={() => setFiltros((f: any) => ({ ...f, monitores: f.monitores.filter((x: string) => x !== m) }))} /></Badge>
            ))}
            <Button variant="ghost" size="xs" onClick={() => setFiltros((f: any) => ({ ...f, monitores: [] }))}>Limpar</Button>
          </div>
          {/* Botões */}
          <div className="flex gap-2 mt-2">
            <Button variant="default" size="sm" onClick={onAplicar}>Aplicar Filtros</Button>
            <Button variant="outline" size="sm" onClick={onLimpar}>Limpar Todos os Filtros</Button>
            <span className="ml-auto text-muted-foreground text-sm">Exibindo {totalResultados} registros</span>
          </div>
        </div>
      )}
    </div>
  );
}
