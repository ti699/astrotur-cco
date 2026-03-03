import { useState, useMemo } from "react";
import {
  Plus, Search, ArrowDownToLine, ArrowUpFromLine, Download, Upload, MoreHorizontal, Eye, Edit, Clock, FileText, Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DetalhesDialog } from "@/components/shared/DetalhesDialog";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";

const mockEntradas = [
  { id: 1, dataHora: "01/11/2025 09:55", monitor: "VALDOMIRO", veiculo: "122420", kmEntrada: 196853, kmInicioRota: 196810, kmFimRota: 196845, motorista: "WALLISON ALVES", cliente: "HDH", localSaida: "ESTÂNCIA", motivo: "RECOLHE NA GARAGEM", programado: true },
  { id: 2, dataHora: "01/11/2025 08:07", monitor: "VALDOMIRO", veiculo: "121902", kmEntrada: 752956, kmInicioRota: 752880, kmFimRota: 752940, motorista: "EDINALDO CORREIA", cliente: "JEEP", localSaida: "PAULISTA", motivo: "MANUTENÇÃO", programado: false, descricao: "REGULAR FREIOS" },
  { id: 3, dataHora: "01/11/2025 00:38", monitor: "ANDERSON", veiculo: "2406", kmEntrada: 179002, kmInicioRota: 178950, kmFimRota: 178990, motorista: "REGINALDO", cliente: "CAMPARI", localSaida: "BARRO", motivo: "MANUTENÇÃO", programado: false, descricao: "CORTANDO ACELERAÇÃO" },
];

const mockSaidas = [
  { id: 1, dataHora: "01/11/2025 10:30", monitor: "VALDOMIRO", veiculo: "122420", kmSaida: 196860, motorista: "MARCOS SILVA", destino: "TECON", vistoriaConforme: true },
  { id: 2, dataHora: "01/11/2025 09:15", monitor: "VALDOMIRO", veiculo: "102508", kmSaida: 94300, motorista: "NELSON MARIANO", destino: "TECON", vistoriaConforme: true },
];

const motivosEntrada = ["RECOLHE NA GARAGEM", "MANUTENÇÃO", "ABASTECIMENTO", "SOLICITAÇÃO OPERAÇÃO"];
const monitores = ["VALDOMIRO", "MACARIO", "IRANILDO", "ANDERSON"];

// Calcula KM morto refinado
const calcKmMorto = (entry: typeof mockEntradas[0]) => {
  const kmSaidaGaragem = entry.kmInicioRota - 10; // mock: saída garagem ~10km antes
  const garagemInicio = entry.kmInicioRota - kmSaidaGaragem;
  const fimGaragem = entry.kmEntrada - entry.kmFimRota;
  return { produtivo: entry.kmFimRota - entry.kmInicioRota, morto: garagemInicio + fimGaragem, total: entry.kmEntrada - kmSaidaGaragem };
};

export default function Portaria() {
  const [searchTerm, setSearchTerm] = useState("");
  const [entradaDialogOpen, setEntradaDialogOpen] = useState(false);
  const [saidaDialogOpen, setSaidaDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<typeof mockEntradas[0] | null>(null);
  const { toast } = useToast();

  const filteredEntradas = useMemo(() => {
    return mockEntradas.filter((e) =>
      e.veiculo.includes(searchTerm) || e.motorista.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredSaidas = useMemo(() => {
    return mockSaidas.filter((s) =>
      s.veiculo.includes(searchTerm) || s.motorista.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const stats = useMemo(() => ({
    naGaragem: filteredEntradas.length,
    emOperacao: 42 - filteredEntradas.length,
    entradasHoje: filteredEntradas.length,
    saidasHoje: filteredSaidas.length,
  }), [filteredEntradas, filteredSaidas]);

  const handleViewEntry = (entry: typeof mockEntradas[0]) => {
    setSelectedEntry(entry);
    setDetalhesOpen(true);
  };

  const handleRegistrarEntrada = () => {
    toast({ title: "Entrada registrada!", description: "A entrada do veículo foi registrada com sucesso." });
    setEntradaDialogOpen(false);
  };

  const handleRegistrarSaida = () => {
    toast({ title: "Saída registrada!", description: "A saída do veículo foi registrada com sucesso." });
    setSaidaDialogOpen(false);
  };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "Relatório de Portaria - Entradas e Saídas",
      resumo: [
        { label: "Na Garagem", valor: stats.naGaragem.toString() },
        { label: "Em Operação", valor: stats.emOperacao.toString() },
        { label: "Entradas Hoje", valor: stats.entradasHoje.toString() },
        { label: "Saídas Hoje", valor: stats.saidasHoje.toString() },
      ],
      colunas: ["Data/Hora", "Monitor", "Veículo", "KM", "Motorista", "Cliente", "Motivo"],
      dados: mockEntradas.map((e) => [e.dataHora, e.monitor, `#${e.veiculo}`, e.kmEntrada.toLocaleString(), e.motorista, e.cliente, e.motivo]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Detalhes Modal with KM Morto */}
      {selectedEntry && (
        <DetalhesDialog
          open={detalhesOpen}
          onOpenChange={setDetalhesOpen}
          titulo={`Entrada - Veículo #${selectedEntry.veiculo}`}
          subtitulo={selectedEntry.dataHora}
          campos={[
            { label: "Monitor", valor: selectedEntry.monitor },
            { label: "Motorista", valor: selectedEntry.motorista },
            { label: "Cliente", valor: selectedEntry.cliente },
            { label: "Motivo", valor: selectedEntry.motivo, badge: true },
            { label: "KM Entrada", valor: selectedEntry.kmEntrada.toLocaleString() },
            { label: "KM Início Rota", valor: selectedEntry.kmInicioRota.toLocaleString() },
            { label: "KM Fim Rota", valor: selectedEntry.kmFimRota.toLocaleString() },
            { label: "KM Produtivo", valor: `${calcKmMorto(selectedEntry).produtivo} km` },
            { label: "KM Morto (Improdutivo)", valor: `${calcKmMorto(selectedEntry).morto} km` },
            { label: "Descrição", valor: selectedEntry.descricao || "Sem observações" },
          ]}
        />
      )}

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Portaria" colunasEsperadas={["data_hora", "monitor", "veiculo", "km", "motorista", "cliente", "motivo"]} onImportar={() => {}} />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Controle de Portaria</h1>
          <p className="page-description">Gestão de entrada e saída de veículos da frota</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />Relatório</Button>

          <Dialog open={entradaDialogOpen} onOpenChange={setEntradaDialogOpen}>
            <Button variant="outline" onClick={() => setEntradaDialogOpen(true)}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />Registrar Entrada
            </Button>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Entrada de Veículo</DialogTitle>
                <DialogDescription>Registre a entrada de um veículo na garagem</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Data/Hora</Label><Input type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} /></div>
                  <div className="space-y-2"><Label>Monitor</Label><Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{monitores.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Veículo *</Label><Input placeholder="Ex: 121904" /></div>
                  <div className="space-y-2"><Label>KM Entrada *</Label><Input type="number" placeholder="Ex: 196853" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>KM Início da Rota</Label><Input type="number" placeholder="Onde pegou passageiros" /></div>
                  <div className="space-y-2"><Label>KM Fim da Rota</Label><Input type="number" placeholder="Onde deixou passageiros" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Motorista</Label><Input placeholder="Nome do motorista" /></div>
                  <div className="space-y-2"><Label>Cliente</Label><Input placeholder="Ex: JEEP" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Local de Saída</Label><Input placeholder="Última localização" /></div>
                  <div className="space-y-2"><Label>Motivo da Entrada</Label><Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{motivosEntrada.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>Descrições Adicionais</Label><Textarea placeholder="Observações..." /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEntradaDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleRegistrarEntrada}><ArrowDownToLine className="mr-2 h-4 w-4" />Registrar Entrada</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={saidaDialogOpen} onOpenChange={setSaidaDialogOpen}>
            <Button onClick={() => setSaidaDialogOpen(true)}>
              <ArrowUpFromLine className="mr-2 h-4 w-4" />Registrar Saída
            </Button>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Saída de Veículo</DialogTitle>
                <DialogDescription>Registre a saída de um veículo da garagem</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Data/Hora</Label><Input type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} /></div>
                  <div className="space-y-2"><Label>Monitor</Label><Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{monitores.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Veículo *</Label><Input placeholder="Ex: 121904" /></div>
                  <div className="space-y-2"><Label>KM Saída *</Label><Input type="number" placeholder="Ex: 196860" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Motorista</Label><Input placeholder="Nome do motorista" /></div>
                  <div className="space-y-2"><Label>Destino/Cliente</Label><Input placeholder="Ex: TECON" /></div>
                </div>
                <div className="space-y-2">
                  <Label>Vistoria Conforme?</Label>
                  <Select defaultValue="sim"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sim">Sim - Conforme</SelectItem><SelectItem value="nao">Não - Com problemas</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2"><Label>Observações</Label><Textarea placeholder="Observações adicionais..." /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaidaDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleRegistrarSaida}><ArrowUpFromLine className="mr-2 h-4 w-4" />Registrar Saída</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats - Dynamic */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold">{stats.naGaragem}</p><p className="text-sm text-muted-foreground">Na garagem agora</p></div><ArrowDownToLine className="h-8 w-8 text-muted-foreground/50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold">{stats.emOperacao}</p><p className="text-sm text-muted-foreground">Em operação</p></div><ArrowUpFromLine className="h-8 w-8 text-muted-foreground/50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold">{stats.entradasHoje}</p><p className="text-sm text-muted-foreground">Entradas hoje</p></div><Clock className="h-8 w-8 text-muted-foreground/50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold">{stats.saidasHoje}</p><p className="text-sm text-muted-foreground">Saídas hoje</p></div><Clock className="h-8 w-8 text-muted-foreground/50" /></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="entradas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
        </TabsList>

        <TabsContent value="entradas" className="space-y-4">
          <Card><CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por veículo, motorista..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Input type="date" className="w-full md:w-[180px]" />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="data-table-header">
                  <TableHead>Data/Hora</TableHead><TableHead>Monitor</TableHead><TableHead>Veículo</TableHead><TableHead>KM</TableHead><TableHead>Motorista</TableHead><TableHead>Cliente</TableHead><TableHead>KM Morto</TableHead><TableHead>Motivo</TableHead><TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntradas.map((entrada) => {
                  const km = calcKmMorto(entrada);
                  return (
                    <TableRow key={entrada.id} className="data-table-row">
                      <TableCell className="font-mono text-sm">{entrada.dataHora}</TableCell>
                      <TableCell>{entrada.monitor}</TableCell>
                      <TableCell className="font-mono font-semibold">#{entrada.veiculo}</TableCell>
                      <TableCell className="font-mono">{entrada.kmEntrada.toLocaleString()}</TableCell>
                      <TableCell>{entrada.motorista}</TableCell>
                      <TableCell>{entrada.cliente}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Route className="h-3 w-3 text-amber-600" />
                          <span className="text-sm font-medium text-amber-600">{km.morto} km</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={entrada.motivo === "MANUTENÇÃO" ? "destructive" : "secondary"}>{entrada.motivo}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewEntry(entrada)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="saidas" className="space-y-4">
          <Card><CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por veículo, motorista..." className="pl-10" />
              </div>
              <Input type="date" className="w-full md:w-[180px]" />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="data-table-header">
                  <TableHead>Data/Hora</TableHead><TableHead>Monitor</TableHead><TableHead>Veículo</TableHead><TableHead>KM</TableHead><TableHead>Motorista</TableHead><TableHead>Destino</TableHead><TableHead>Vistoria</TableHead><TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSaidas.map((saida) => (
                  <TableRow key={saida.id} className="data-table-row">
                    <TableCell className="font-mono text-sm">{saida.dataHora}</TableCell>
                    <TableCell>{saida.monitor}</TableCell>
                    <TableCell className="font-mono font-semibold">#{saida.veiculo}</TableCell>
                    <TableCell className="font-mono">{saida.kmSaida.toLocaleString()}</TableCell>
                    <TableCell>{saida.motorista}</TableCell>
                    <TableCell>{saida.destino}</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-800 hover:bg-green-100">Conforme</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
