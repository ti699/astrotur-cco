import { useState, useMemo } from "react";
import {
  Plus, Search, Download, Upload, MoreHorizontal, Eye, FileText, CheckCircle, Clock, AlertTriangle, DollarSign, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NovaAvariaWorkflow } from "@/components/avarias/NovaAvariaWorkflow";
import { DiagramaOnibus } from "@/components/avarias/DiagramaOnibus";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";

const initialAvarias = [
  { id: 1, numeroTalao: "DAI-133", data: "10/10/2026", veiculo: "2536", motorista: "SANDRO MARQUES", tipoAvaria: "CURVÃO", localVeiculo: "Traseiro lado direito", valorEstimado: 383.50, status: "PRECIFICADO", daiPreenchido: true },
  { id: 2, numeroTalao: "DAI-132", data: "08/10/2026", veiculo: "121904", motorista: "EDUARDO PEREIRA", tipoAvaria: "COLISÃO", localVeiculo: "Lateral esquerda", valorEstimado: 1250.00, status: "AGUARDANDO_DAI", daiPreenchido: false },
  { id: 3, numeroTalao: "DAI-131", data: "05/10/2026", veiculo: "101318", motorista: "JOSÉ CARLOS", tipoAvaria: "VIDRO", localVeiculo: "Janela traseira", valorEstimado: 450.00, status: "JULGADO_COBRADO", daiPreenchido: true, decisao: "COBRADO", percentualDesconto: 30 },
  { id: 4, numeroTalao: "DAI-130", data: "01/10/2026", veiculo: "102104", motorista: "PAULO SÉRGIO", tipoAvaria: "LATARIA", localVeiculo: "Para-choque dianteiro", valorEstimado: 890.00, status: "JULGADO_ABONADO", daiPreenchido: true, decisao: "ABONADO" },
];

const getStatusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
    AGUARDANDO_PRECIFICACAO: { label: "Aguardando Precificação", cls: "bg-gray-100 text-gray-800", icon: Clock },
    PRECIFICADO: { label: "Precificado", cls: "bg-blue-100 text-blue-800", icon: DollarSign },
    AGUARDANDO_DAI: { label: "Aguardando DAI", cls: "bg-amber-100 text-amber-800", icon: FileText },
    AGUARDANDO_JULGAMENTO: { label: "Aguardando Julgamento", cls: "bg-purple-100 text-purple-800", icon: Clock },
    JULGADO_COBRADO: { label: "Cobrado", cls: "bg-red-100 text-red-800", icon: AlertTriangle },
    JULGADO_ABONADO: { label: "Abonado", cls: "bg-green-100 text-green-800", icon: CheckCircle },
  };
  const info = map[status] || { label: status, cls: "", icon: Clock };
  const Icon = info.icon;
  return <Badge className={`${info.cls} hover:${info.cls} gap-1`}><Icon className="h-3 w-3" />{info.label}</Badge>;
};

const workflowSteps = [
  { label: "Foto (Portaria)", icon: Camera },
  { label: "DAI (CCO)", icon: FileText },
  { label: "Precificação", icon: DollarSign },
  { label: "Julgamento", icon: Clock },
  { label: "Conclusão", icon: CheckCircle },
];

export default function Avarias() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [avarias, setAvarias] = useState<typeof initialAvarias>([]);
  const [importOpen, setImportOpen] = useState(false);

  // Dossiê modal
  const [dossieOpen, setDossieOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState<typeof initialAvarias[0] | null>(null);

  // Precificar modal
  const [precificarOpen, setPrecificarOpen] = useState(false);
  const [valorPrecificacao, setValorPrecificacao] = useState("");

  // Julgar modal
  const [julgarOpen, setJulgarOpen] = useState(false);
  const [decisao, setDecisao] = useState("COBRADO");
  const [percentual, setPercentual] = useState("30");
  const [justificativa, setJustificativa] = useState("");

  const handleNovaAvaria = (novaAvaria: any) => setAvarias((prev) => [novaAvaria, ...prev]);

  const filtered = useMemo(() => {
    return avarias.filter((a) => {
      const matchSearch = a.numeroTalao.toLowerCase().includes(searchTerm.toLowerCase()) || a.veiculo.includes(searchTerm) || a.motorista.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [avarias, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    aguardandoDAI: filtered.filter((a) => a.status === "AGUARDANDO_DAI").length,
    emJulgamento: filtered.filter((a) => a.status === "AGUARDANDO_JULGAMENTO" || a.status === "PRECIFICADO").length,
    valorCobrado: filtered.filter((a) => a.status === "JULGADO_COBRADO").reduce((s, a) => s + a.valorEstimado, 0),
    valorAbonado: filtered.filter((a) => a.status === "JULGADO_ABONADO").reduce((s, a) => s + a.valorEstimado, 0),
  }), [filtered]);

  const handleDossie = (a: typeof initialAvarias[0]) => { setSelectedAvaria(a); setDossieOpen(true); };
  const handlePrecificar = (a: typeof initialAvarias[0]) => { setSelectedAvaria(a); setValorPrecificacao(a.valorEstimado.toString()); setPrecificarOpen(true); };
  const handleJulgar = (a: typeof initialAvarias[0]) => { setSelectedAvaria(a); setJulgarOpen(true); };

  const confirmPrecificar = () => {
    if (!selectedAvaria) return;
    setAvarias((prev) => prev.map((a) => a.id === selectedAvaria.id ? { ...a, valorEstimado: parseFloat(valorPrecificacao) || 0, status: "PRECIFICADO" } : a));
    toast({ title: "Precificação salva!", description: `${selectedAvaria.numeroTalao} precificado.` });
    setPrecificarOpen(false);
  };

  const confirmJulgar = () => {
    if (!selectedAvaria) return;
    const newStatus = decisao === "COBRADO" ? "JULGADO_COBRADO" : "JULGADO_ABONADO";
    setAvarias((prev) => prev.map((a) => a.id === selectedAvaria.id ? { ...a, status: newStatus, decisao, percentualDesconto: parseInt(percentual) } : a));
    toast({ title: "Julgamento registrado!", description: `${selectedAvaria.numeroTalao} - ${decisao}` });
    setJulgarOpen(false);
  };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "Relatório de Avarias / DAIs",
      resumo: [
        { label: "Total", valor: stats.total.toString() },
        { label: "Aguardando DAI", valor: stats.aguardandoDAI.toString() },
        { label: "Em Julgamento", valor: stats.emJulgamento.toString() },
        { label: "Valor Cobrado", valor: `R$ ${stats.valorCobrado.toFixed(2)}` },
        { label: "Valor Abonado", valor: `R$ ${stats.valorAbonado.toFixed(2)}` },
      ],
      colunas: ["Talão", "Data", "Veículo", "Motorista", "Tipo", "Valor", "Status"],
      dados: filtered.map((a) => [a.numeroTalao, a.data, `#${a.veiculo}`, a.motorista, a.tipoAvaria, `R$ ${a.valorEstimado.toFixed(2)}`, a.status]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <NovaAvariaWorkflow open={workflowOpen} onOpenChange={setWorkflowOpen} onAvariaCreated={handleNovaAvaria} />

      {/* Dossiê Modal */}
      <Dialog open={dossieOpen} onOpenChange={setDossieOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Dossiê Completo - {selectedAvaria?.numeroTalao}</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1">
            {selectedAvaria && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground uppercase">Veículo</p><p className="font-mono font-bold">#{selectedAvaria.veiculo}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Motorista</p><p className="font-medium">{selectedAvaria.motorista}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Tipo Avaria</p><p>{selectedAvaria.tipoAvaria}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Local</p><p>{selectedAvaria.localVeiculo}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Valor</p><p className="font-mono font-bold">R$ {selectedAvaria.valorEstimado.toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Status</p>{getStatusBadge(selectedAvaria.status)}</div>
                </div>
                <DiagramaOnibus value={selectedAvaria.localVeiculo} readOnly />
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Precificar Modal */}
      <Dialog open={precificarOpen} onOpenChange={setPrecificarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Precificar - {selectedAvaria?.numeroTalao}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" value={valorPrecificacao} onChange={(e) => setValorPrecificacao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrecificarOpen(false)}>Cancelar</Button>
            <Button onClick={confirmPrecificar}>Confirmar Precificação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Julgar Modal */}
      <Dialog open={julgarOpen} onOpenChange={setJulgarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Julgar - {selectedAvaria?.numeroTalao}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Decisão</Label>
              <Select value={decisao} onValueChange={setDecisao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COBRADO">Cobrar do Motorista</SelectItem>
                  <SelectItem value="ABONADO">Abonar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {decisao === "COBRADO" && (
              <div className="space-y-2">
                <Label>Percentual de Desconto (%)</Label>
                <Input type="number" value={percentual} onChange={(e) => setPercentual(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Motivo da decisão..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJulgarOpen(false)}>Cancelar</Button>
            <Button onClick={confirmJulgar}>Registrar Julgamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Avarias" colunasEsperadas={["numero_talao", "data", "veiculo", "motorista", "tipo_avaria", "local_veiculo", "valor_estimado"]} onImportar={() => {}} />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Gestão de Avarias</h1>
          <p className="page-description">Controle completo do processo de avarias - do registro ao desconto</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />Relatório</Button>
          <Button onClick={() => setWorkflowOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova Avaria</Button>
        </div>
      </div>

      {/* Stats - Dynamic */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total filtrado</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{stats.aguardandoDAI}</p><p className="text-sm text-muted-foreground">Aguardando DAI</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-purple-600">{stats.emJulgamento}</p><p className="text-sm text-muted-foreground">Em julgamento</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-red-600">R$ {stats.valorCobrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-sm text-muted-foreground">Valor cobrado</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-600">R$ {stats.valorAbonado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-sm text-muted-foreground">Valor abonado</p></CardContent></Card>
      </div>

      {/* Workflow */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Fluxo de Processamento</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {workflowSteps.map((step, index) => (
              <div key={step.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${index < 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</div>
                  <span className="mt-2 text-xs text-muted-foreground">{step.label}</span>
                </div>
                {index < workflowSteps.length - 1 && <div className={`h-1 flex-1 mx-2 rounded ${index < 2 ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por talão, veículo ou motorista..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="AGUARDANDO_PRECIFICACAO">Aguardando Precificação</SelectItem>
                <SelectItem value="PRECIFICADO">Precificado</SelectItem>
                <SelectItem value="AGUARDANDO_DAI">Aguardando DAI</SelectItem>
                <SelectItem value="AGUARDANDO_JULGAMENTO">Aguardando Julgamento</SelectItem>
                <SelectItem value="JULGADO_COBRADO">Cobrado</SelectItem>
                <SelectItem value="JULGADO_ABONADO">Abonado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="data-table-header">
                <TableHead>Talão</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((avaria) => (
                <TableRow key={avaria.id} className="data-table-row">
                  <TableCell className="font-mono font-semibold text-primary">{avaria.numeroTalao}</TableCell>
                  <TableCell className="font-mono text-sm">{avaria.data}</TableCell>
                  <TableCell className="font-mono">#{avaria.veiculo}</TableCell>
                  <TableCell>{avaria.motorista}</TableCell>
                  <TableCell><div><p className="font-medium">{avaria.tipoAvaria}</p><p className="text-xs text-muted-foreground">{avaria.localVeiculo}</p></div></TableCell>
                  <TableCell className="font-mono font-semibold">R$ {avaria.valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{getStatusBadge(avaria.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDossie(avaria)}><Eye className="mr-2 h-4 w-4" />Ver Dossiê Completo</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handlePrecificar(avaria)}><DollarSign className="mr-2 h-4 w-4" />Precificar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleJulgar(avaria)}><CheckCircle className="mr-2 h-4 w-4" />Julgar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
