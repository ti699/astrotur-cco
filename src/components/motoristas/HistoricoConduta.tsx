import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, XCircle, Calendar, TrendingUp, TrendingDown, DollarSign, Printer } from "lucide-react";
import type { HistoricoCondutaMotorista } from "@/types";
import { gerarFichaMotorista } from "@/utils/gerarRelatorioPDF";

interface HistoricoCondutaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: { id: string; nome: string; matricula: string };
}

const mockHistorico: Record<string, HistoricoCondutaMotorista> = {
  "1": {
    motoristaId: "1", motoristaNome: "SANDRO MARQUES", dataAdmissao: new Date("2019-03-15"),
    totalAvarias: 5, avariasCobradas: 3, avariasAbonadas: 2, percentualCobrado: 60, advertencias: 1,
    historicoDAIs: [
      { numeroTalao: "DAI-133", data: new Date("2026-10-10"), tipoAvaria: "CURVÃO", valorEstimado: 383.50, decisao: "COBRADO", percentualDesconto: 30 },
      { numeroTalao: "DAI-125", data: new Date("2026-08-22"), tipoAvaria: "RETROVISOR", valorEstimado: 180.00, decisao: "ABONADO" },
      { numeroTalao: "DAI-118", data: new Date("2026-06-05"), tipoAvaria: "LATARIA", valorEstimado: 520.00, decisao: "COBRADO", percentualDesconto: 50 },
      { numeroTalao: "DAI-098", data: new Date("2025-12-12"), tipoAvaria: "PARA-CHOQUE", valorEstimado: 890.00, decisao: "COBRADO", percentualDesconto: 30 },
      { numeroTalao: "DAI-072", data: new Date("2025-05-03"), tipoAvaria: "VIDRO", valorEstimado: 350.00, decisao: "ABONADO" },
    ],
  },
  "2": {
    motoristaId: "2", motoristaNome: "EDUARDO PEREIRA", dataAdmissao: new Date("2020-08-01"),
    totalAvarias: 2, avariasCobradas: 1, avariasAbonadas: 1, percentualCobrado: 50, advertencias: 0,
    historicoDAIs: [
      { numeroTalao: "DAI-132", data: new Date("2026-10-08"), tipoAvaria: "COLISÃO", valorEstimado: 1250.00, decisao: "COBRADO", percentualDesconto: 30 },
      { numeroTalao: "DAI-089", data: new Date("2025-09-15"), tipoAvaria: "PNEU", valorEstimado: 280.00, decisao: "ABONADO" },
    ],
  },
  "3": {
    motoristaId: "3", motoristaNome: "PAULO SÉRGIO", dataAdmissao: new Date("2018-01-10"),
    totalAvarias: 0, avariasCobradas: 0, avariasAbonadas: 0, percentualCobrado: 0, advertencias: 0, historicoDAIs: [],
  },
};

const calcularTempoEmpresa = (dataAdmissao: Date): string => {
  const hoje = new Date();
  const diffDays = Math.ceil(Math.abs(hoje.getTime() - dataAdmissao.getTime()) / (1000 * 60 * 60 * 24));
  const anos = Math.floor(diffDays / 365);
  const meses = Math.floor((diffDays % 365) / 30);
  if (anos > 0 && meses > 0) return `${anos} ano${anos > 1 ? "s" : ""} e ${meses} ${meses > 1 ? "meses" : "mês"}`;
  if (anos > 0) return `${anos} ano${anos > 1 ? "s" : ""}`;
  return `${meses} ${meses > 1 ? "meses" : "mês"}`;
};

export function HistoricoConduta({ open, onOpenChange, motorista }: HistoricoCondutaProps) {
  const historico = mockHistorico[motorista.id] || {
    motoristaId: motorista.id, motoristaNome: motorista.nome, dataAdmissao: new Date(),
    totalAvarias: 0, avariasCobradas: 0, avariasAbonadas: 0, percentualCobrado: 0, advertencias: 0, historicoDAIs: [],
  };

  const tempoEmpresa = calcularTempoEmpresa(historico.dataAdmissao);
  const totalValorCobrado = historico.historicoDAIs
    .filter((d) => d.decisao === "COBRADO")
    .reduce((acc, d) => acc + (d.valorEstimado * (d.percentualDesconto || 100)) / 100, 0);

  const handleImprimirPDF = async () => {
    await gerarFichaMotorista({
      nome: motorista.nome,
      matricula: motorista.matricula,
      tempoEmpresa,
      totalAvarias: historico.totalAvarias,
      cobradas: historico.avariasCobradas,
      abonadas: historico.avariasAbonadas,
      advertencias: historico.advertencias,
      totalCobrado: totalValorCobrado,
      dais: historico.historicoDAIs.map((d) => ({
        talao: d.numeroTalao,
        data: d.data.toLocaleDateString("pt-BR"),
        tipo: d.tipoAvaria,
        valor: `R$ ${d.valorEstimado.toFixed(2)}`,
        decisao: d.decisao,
        desconto: d.percentualDesconto ? `${d.percentualDesconto}%` : "-",
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Histórico de Conduta</DialogTitle>
              <DialogDescription>{motorista.nome} - Matrícula: {motorista.matricula}</DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleImprimirPDF}>
              <Printer className="mr-2 h-4 w-4" />Imprimir PDF
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{tempoEmpresa}</p>
                <p className="text-xs text-muted-foreground">Na empresa</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 text-center">
                <p className="text-2xl font-bold text-blue-600">{historico.totalAvarias}</p>
                <p className="text-xs text-muted-foreground">Total de Avarias</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 text-center">
                <p className="text-2xl font-bold text-red-600">{historico.avariasCobradas}</p>
                <p className="text-xs text-muted-foreground">Cobradas</p>
              </div>
              <div className="p-4 rounded-lg bg-green-50 text-center">
                <p className="text-2xl font-bold text-green-600">{historico.avariasAbonadas}</p>
                <p className="text-xs text-muted-foreground">Abonadas</p>
              </div>
            </div>

            {/* Barra Cobrado vs Abonado */}
            {historico.totalAvarias > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1"><TrendingDown className="h-4 w-4 text-red-500" />Cobrado: {historico.percentualCobrado}%</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4 text-green-500" />Abonado: {100 - historico.percentualCobrado}%</span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden bg-green-200">
                  <div className="absolute left-0 top-0 h-full bg-red-500 transition-all" style={{ width: `${historico.percentualCobrado}%` }} />
                </div>
              </div>
            )}

            {/* Advertências */}
            {historico.advertencias > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">{historico.advertencias} Advertência{historico.advertencias > 1 ? "s" : ""}</p>
                  <p className="text-sm text-amber-700">Este motorista possui advertências em seu histórico.</p>
                </div>
              </div>
            )}

            {/* Valor Total Cobrado */}
            {totalValorCobrado > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <DollarSign className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Cobrado em Avarias</p>
                  <p className="text-xl font-bold text-red-600">R$ {totalValorCobrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            )}

            {/* Tabela de DAIs */}
            <div>
              <h4 className="text-sm font-medium mb-3">Histórico de DAIs</h4>
              {historico.historicoDAIs.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Talão</TableHead><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Decisão</TableHead><TableHead>Desconto</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {historico.historicoDAIs.map((dai) => (
                      <TableRow key={dai.numeroTalao}>
                        <TableCell className="font-mono font-medium">{dai.numeroTalao}</TableCell>
                        <TableCell className="font-mono text-sm">{dai.data.toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>{dai.tipoAvaria}</TableCell>
                        <TableCell className="font-mono">R$ {dai.valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          {dai.decisao === "COBRADO" ? (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1"><XCircle className="h-3 w-3" />Cobrado</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1"><CheckCircle className="h-3 w-3" />Abonado</Badge>
                          )}
                        </TableCell>
                        <TableCell>{dai.percentualDesconto ? `${dai.percentualDesconto}%` : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">Nenhuma avaria registrada</p>
                  <p className="text-sm">Este motorista possui histórico limpo.</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
