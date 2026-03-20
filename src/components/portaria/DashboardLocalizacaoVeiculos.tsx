import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Movimentacao {
  id: number;
  veiculo: string;
  motorista: string;
  dataHora: string;
  tipo: "entrada" | "saida";
}

interface VeiculoStatus {
  veiculo: string;
  motorista: string;
  dataHora: string;
  tipo: "entrada" | "saida";
}

const STATUS = {
  EM_OPERACAO: "Em Operação",
  NA_GARAGEM: "Na Garagem",
  SEM_REGISTRO: "Sem Registro",
};

const STATUS_ICON = {
  EM_OPERACAO: "🟢",
  NA_GARAGEM: "🔵",
  SEM_REGISTRO: "⚪",
};

function getStatus(tipo?: "entrada" | "saida") {
  if (tipo === "saida") return { label: STATUS.EM_OPERACAO, icon: STATUS_ICON.EM_OPERACAO, color: "bg-green-100 text-green-800" };
  if (tipo === "entrada") return { label: STATUS.NA_GARAGEM, icon: STATUS_ICON.NA_GARAGEM, color: "bg-blue-100 text-blue-800" };
  return { label: STATUS.SEM_REGISTRO, icon: STATUS_ICON.SEM_REGISTRO, color: "bg-gray-100 text-gray-800" };
}

export function DashboardLocalizacaoVeiculos() {
  // MOCK TEMPORÁRIO PARA VISUALIZAÇÃO
  const MOCKS: Movimentacao[] = [
    { id: 1, veiculo: 'ABC1A23', motorista: 'João Silva', dataHora: new Date().toISOString(), tipo: 'saida' },
    { id: 2, veiculo: 'DEF4B56', motorista: 'Maria Souza', dataHora: new Date(Date.now() - 1000*60*60).toISOString(), tipo: 'entrada' },
    { id: 3, veiculo: 'GHI7C89', motorista: 'Carlos Lima', dataHora: new Date(Date.now() - 1000*60*60*2).toISOString(), tipo: 'saida' },
  ];
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(MOCKS);
  const [filtro, setFiltro] = useState<"todos" | "em_operacao" | "na_garagem">("todos");
  const [modalVeiculo, setModalVeiculo] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Movimentacao[]>([]);

  // Carrega movimentações e escuta websocket
  // useEffect(() => {
  //   let subscription: any;
  //   async function fetchMovimentacoes() {
  //     const { data, error } = await supabase
  //       .from("portaria_movimentacoes")
  //       .select("id, veiculo, motorista, data_hora, tipo")
  //       .order("data_hora", { ascending: false });
  //     if (!error && data) {
  //       setMovimentacoes(
  //         data.map((m: any) => ({
  //           id: m.id,
  //           veiculo: String(m.veiculo),
  //           motorista: m.motorista || "",
  //           dataHora: m.data_hora,
  //           tipo: m.tipo,
  //         }))
  //       );
  //     }
  //     // WebSocket realtime
  //     subscription = supabase
  //       .channel("portaria_movimentacoes_changes")
  //       .on(
  //         "postgres_changes",
  //         { event: "*", schema: "public", table: "portaria_movimentacoes" },
  //         (payload: any) => {
  //           fetchMovimentacoes();
  //         }
  //       )
  //       .subscribe();
  //   }
  //   fetchMovimentacoes();
  //   return () => {
  //     if (subscription) supabase.removeChannel(subscription);
  //   };
  // }, []);

  // Determina status atual de cada veículo
  const veiculosStatus = useMemo(() => {
    const map = new Map<string, VeiculoStatus>();
    for (const m of movimentacoes) {
      if (!map.has(m.veiculo)) {
        map.set(m.veiculo, {
          veiculo: m.veiculo,
          motorista: m.motorista,
          dataHora: m.dataHora,
          tipo: m.tipo,
        });
      }
    }
    return Array.from(map.values());
  }, [movimentacoes]);

  // Filtro
  const veiculosFiltrados = useMemo(() => {
    if (filtro === "todos") return veiculosStatus;
    if (filtro === "em_operacao") return veiculosStatus.filter(v => v.tipo === "saida");
    if (filtro === "na_garagem") return veiculosStatus.filter(v => v.tipo === "entrada");
    return veiculosStatus;
  }, [veiculosStatus, filtro]);

  // Contadores
  const total = veiculosStatus.length;
  const emOperacao = veiculosStatus.filter(v => v.tipo === "saida").length;
  const naGaragem = veiculosStatus.filter(v => v.tipo === "entrada").length;

  // Histórico do veículo
  function abrirHistorico(veiculo: string) {
    setModalVeiculo(veiculo);
    setHistorico(movimentacoes.filter(m => m.veiculo === veiculo));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h2 className="text-xl font-bold">Localização de Veículos</h2>
        <div className="flex gap-2 flex-wrap">
          <span className="font-medium">Total: {total} veículos</span>
          <span className="text-green-700">| {emOperacao} Em Operação</span>
          <span className="text-blue-700">| {naGaragem} Na Garagem</span>
        </div>
        <div className="flex gap-2">
          <Button variant={filtro === "todos" ? "default" : "outline"} onClick={() => setFiltro("todos")}>Todos</Button>
          <Button variant={filtro === "em_operacao" ? "default" : "outline"} onClick={() => setFiltro("em_operacao")}>Em Operação</Button>
          <Button variant={filtro === "na_garagem" ? "default" : "outline"} onClick={() => setFiltro("na_garagem")}>Na Garagem</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {veiculosFiltrados.map((v) => {
          const status = getStatus(v.tipo);
          return (
            <Card key={v.veiculo} className="cursor-pointer hover:shadow-md transition min-w-0" onClick={() => abrirHistorico(v.veiculo)}>
              <CardContent className="flex flex-col items-center gap-2 p-3 text-sm">
                <div className="text-3xl">🚍</div>
                <div className="font-mono font-bold truncate w-full text-center text-base" title={v.veiculo}>{v.veiculo}</div>
                <div className="truncate w-full text-gray-600 text-xs text-center" title={v.motorista}>{v.motorista || "-"}</div>
                <Badge className={status.color + ' text-[11px] px-2 py-0.5'}>{status.icon} {status.label}</Badge>
                <div className="text-[11px] text-gray-500 text-center">{new Date(v.dataHora).toLocaleString("pt-BR")}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Dialog open={!!modalVeiculo} onOpenChange={() => setModalVeiculo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico do Veículo {modalVeiculo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {historico.map((h) => (
              <div key={h.id} className="flex items-center gap-2 border-b pb-1">
                <span className="font-mono font-bold">{h.dataHora ? new Date(h.dataHora).toLocaleString("pt-BR") : ""}</span>
                <Badge className={getStatus(h.tipo).color}>{getStatus(h.tipo).icon} {getStatus(h.tipo).label}</Badge>
                <span className="text-sm">Motorista: {h.motorista || "-"}</span>
              </div>
            ))}
            {historico.length === 0 && <div className="text-center text-gray-500">Sem registros</div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
