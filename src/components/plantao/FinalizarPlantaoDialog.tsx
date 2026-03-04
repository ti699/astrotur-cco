import { useState } from "react";
import { jsPDF } from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardCheck,
  AlertTriangle,
  FileText,
  Mail,
  Download,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useOcorrencias } from "@/services/useApi";
import { Textarea } from "@/components/ui/textarea";

interface FinalizarPlantaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plantonistas = ["VALDOMIRO", "MACARIO", "IRANILDO", "ANDERSON"];


const getTipoColor = (tipo: string) => {
  switch (tipo) {
    case "ATRASO":
      return "bg-amber-100 text-amber-800";
    case "SOCORRO":
      return "bg-red-100 text-red-800";
    case "TROCA":
      return "bg-blue-100 text-blue-800";
    case "INFORMAÇÃO":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "CONCLUIDO":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "EM_ANDAMENTO":
      return <Clock className="h-4 w-4 text-amber-600" />;
    case "PENDENTE":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

export function FinalizarPlantaoDialog({
  open,
  onOpenChange,
}: FinalizarPlantaoDialogProps) {
  const { toast } = useToast();
  const { registrarLog } = useAuditLog();
  const { data: ocorrenciasRaw = [] } = useOcorrencias();

  // Mapeia ocorrências reais para o formato do relatório
  const ocorrenciasTurno = ocorrenciasRaw.map((o) => ({
    id: String(o.id),
    hora: o.horario_socorro || o.horario_saida || "--:--",
    tipo: o.tipo_ocorrencia || o.tipo_quebra_nome || "OCORRÊNCIA",
    veiculo: o.veiculo_placa || "--",
    cliente: o.cliente_nome || "--",
    status: o.status === "resolvido" ? "CONCLUIDO" : o.status === "em_andamento" ? "EM_ANDAMENTO" : "PENDENTE",
    descricao: o.descricao || "",
  }));

  const [proximoPlantonista, setProximoPlantonista] = useState("");
  const [pendenciasConfirmadas, setPendenciasConfirmadas] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  const pendencias = ocorrenciasTurno.filter(
    (o) => o.status !== "CONCLUIDO"
  );
  const concluidas = ocorrenciasTurno.filter(
    (o) => o.status === "CONCLUIDO"
  );

  const totais = {
    total: ocorrenciasTurno.length,
    atrasos: ocorrenciasTurno.filter((o) => o.tipo === "ATRASO").length,
    socorros: ocorrenciasTurno.filter((o) => o.tipo === "SOCORRO").length,
    trocas: ocorrenciasTurno.filter((o) => o.tipo === "TROCA" || o.tipo === "TROCA_VEICULO").length,
    informacoes: ocorrenciasTurno.filter((o) => o.tipo === "INFORMAÇÃO" || o.tipo === "INFORMACAO").length,
  };

  const plantonistaAtual = "VALDOMIRO"; // Em produção, virá do contexto de autenticação
  const turnoInicio = "06:00";
  const turnoFim = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const gerarPDF = () => {
    const doc = new jsPDF();
    const dataAtual = new Date().toLocaleDateString("pt-BR");
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE PLANTÃO - CCO", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${dataAtual}`, 20, 35);
    doc.text(`Turno: ${turnoInicio} - ${turnoFim}`, 20, 42);
    doc.text(`Plantonista: ${plantonistaAtual}`, 20, 49);
    
    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
    
    // Resumo
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO", 20, 65);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`• Total de Ocorrências: ${totais.total}`, 25, 75);
    doc.text(`• Atrasos: ${totais.atrasos}`, 25, 82);
    doc.text(`• Socorros: ${totais.socorros}`, 25, 89);
    doc.text(`• Trocas de Veículo: ${totais.trocas}`, 25, 96);
    doc.text(`• Informações: ${totais.informacoes}`, 25, 103);
    
    // Linha separadora
    doc.line(20, 110, 190, 110);
    
    // Ocorrências Detalhadas
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("OCORRÊNCIAS DETALHADAS", 20, 120);
    
    let yPos = 130;
    doc.setFontSize(9);
    
    ocorrenciasTurno.forEach((oc) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${oc.hora} - [${oc.tipo}] #${oc.veiculo} (${oc.cliente})`, 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`   ${oc.descricao}`, 25, yPos + 5);
      doc.text(`   Status: ${oc.status}`, 25, yPos + 10);
      yPos += 18;
    });
    
    // Pendências
    if (pendencias.length > 0) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.line(20, yPos, 190, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PENDÊNCIAS PASSADAS PARA O PRÓXIMO TURNO", 20, yPos);
      yPos += 10;
      
      doc.setFontSize(9);
      pendencias.forEach((p) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(`• ${p.hora} - [${p.tipo}] #${p.veiculo}`, 25, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(`  ${p.descricao}`, 25, yPos + 5);
        yPos += 12;
      });
    }
    
    // Rodapé com passagem de bastão
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.line(20, yPos + 10, 190, yPos + 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Recebido por: ${proximoPlantonista}`, 20, yPos + 20);
    doc.text(`Data/Hora da Passagem: ${new Date().toLocaleString("pt-BR")}`, 20, yPos + 27);
    
    return doc;
  };

  const handleDownloadPDF = () => {
    const doc = gerarPDF();
    const dataAtual = new Date().toISOString().split("T")[0];
    doc.save(`relatorio-plantao-${plantonistaAtual}-${dataAtual}.pdf`);
    
    toast({
      title: "PDF Gerado",
      description: "O relatório foi baixado com sucesso.",
    });
  };

  const handleFinalizarPlantao = async () => {
    if (!proximoPlantonista) {
      toast({
        title: "Selecione o próximo plantonista",
        description: "É obrigatório indicar quem receberá as pendências.",
        variant: "destructive",
      });
      return;
    }

    if (pendencias.length > 0 && !pendenciasConfirmadas) {
      toast({
        title: "Confirme as pendências",
        description: "Você deve confirmar que informou as pendências ao próximo plantonista.",
        variant: "destructive",
      });
      return;
    }

    setEnviandoEmail(true);

    // Registrar log de auditoria
    registrarLog(
      "ocorrencia",
      `plantao_${Date.now()}`,
      "PLANTAO_FINALIZADO",
      undefined,
      undefined,
      {
        plantonistaAnterior: plantonistaAtual,
        plantonistaSeguinte: proximoPlantonista,
        totalOcorrencias: totais.total,
        pendencias: pendencias.length,
      }
    );

    // Gerar PDF
    const doc = gerarPDF();
    const pdfBlob = doc.output("blob");

    // Simular envio de email
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast({
      title: "Plantão Finalizado!",
      description: `Relatório enviado para ti@astroturviagens.com. Pendências passadas para ${proximoPlantonista}.`,
    });

    setEnviandoEmail(false);
    onOpenChange(false);

    // Reset
    setProximoPlantonista("");
    setPendenciasConfirmadas(false);
  };

  const podeFinalizarSemConfirmacao = pendencias.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Finalizar Plantão
          </DialogTitle>
          <DialogDescription>
            Plantonista: <strong>{plantonistaAtual}</strong> | Turno: {turnoInicio} - {turnoFim}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Resumo */}
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{totais.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{totais.atrasos}</p>
                <p className="text-xs text-muted-foreground">Atrasos</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{totais.socorros}</p>
                <p className="text-xs text-muted-foreground">Socorros</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{totais.trocas}</p>
                <p className="text-xs text-muted-foreground">Trocas</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">{totais.informacoes}</p>
                <p className="text-xs text-muted-foreground">Info</p>
              </div>
            </div>

            {/* Pendências */}
            {pendencias.length > 0 && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Pendências ({pendencias.length})</AlertTitle>
                <AlertDescription>
                  As seguintes ocorrências serão passadas para o próximo turno:
                </AlertDescription>
              </Alert>
            )}

            {pendencias.length > 0 && (
              <div className="space-y-2">
                {pendencias.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-red-50/50"
                  >
                    {getStatusIcon(p.status)}
                    <Badge className={getTipoColor(p.tipo)}>{p.tipo}</Badge>
                    <span className="font-mono text-sm">#{p.veiculo}</span>
                    <span className="text-sm flex-1">{p.descricao}</span>
                    <span className="text-xs text-muted-foreground">{p.hora}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ocorrências Concluídas */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Ocorrências Concluídas ({concluidas.length})
              </h4>
              {concluidas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-green-50/50"
                >
                  {getStatusIcon(c.status)}
                  <Badge className={getTipoColor(c.tipo)}>{c.tipo}</Badge>
                  <span className="font-mono text-sm">#{c.veiculo}</span>
                  <span className="text-sm flex-1">{c.descricao}</span>
                  <span className="text-xs text-muted-foreground">{c.hora}</span>
                </div>
              ))}
            </div>

            {/* Passagem de Bastão */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Passagem de Bastão</h4>

              <div className="space-y-2">
                <Label>Observações do Turno</Label>
                <Textarea
                  placeholder="Descreva situações importantes, intercorrências ou qualquer observação relevante para o próximo plantonista..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Próximo Plantonista *</Label>
                <Select
                  value={proximoPlantonista}
                  onValueChange={setProximoPlantonista}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione quem irá assumir" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantonistas
                      .filter((p) => p !== plantonistaAtual)
                      .map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {pendencias.length > 0 && (
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="pendencias"
                    checked={pendenciasConfirmadas}
                    onCheckedChange={(checked) =>
                      setPendenciasConfirmadas(checked === true)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="pendencias"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Confirmo que informei as pendências
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Ao marcar, você confirma que comunicou as pendências ao próximo
                      plantonista.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
          <Button
            onClick={handleFinalizarPlantao}
            disabled={
              enviandoEmail ||
              !proximoPlantonista ||
              (pendencias.length > 0 && !pendenciasConfirmadas)
            }
            className={
              pendencias.length > 0
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {enviandoEmail ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Finalizar e Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
