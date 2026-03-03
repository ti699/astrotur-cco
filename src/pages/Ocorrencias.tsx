import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Search, Download, Upload, MoreHorizontal, Eye, Edit, Trash2, AlertTriangle, Clock, CheckCircle, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DetalhesDialog } from "@/components/shared/DetalhesDialog";
import { ConfirmarExclusaoDialog } from "@/components/shared/ConfirmarExclusaoDialog";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";

const initialOccurrences = [
  { id: 1, data: "25/03/2025", dataISO: "2025-03-25", hora: "18:00", plantonista: "ANDERSON", cliente: "JEEP", tipo: "SOCORRO", veiculoPrevisto: "101256", veiculoSubstituido: "101244", tipoQuebra: "PNEU", status: "CONCLUIDO", descricao: "Motorista PAULO SÉRGIO ligou informando PNEU traseiro interno lado esquerdo baixo" },
  { id: 2, data: "25/03/2025", dataISO: "2025-03-25", hora: "14:14", plantonista: "IRANILDO", cliente: "JEEP", tipo: "SOCORRO", veiculoPrevisto: "102104", veiculoSubstituido: "101256", tipoQuebra: "ELETRICA", status: "CONCLUIDO", descricao: "Mot. Paulo sergio solicitando socorro de ar condicionado" },
  { id: 3, data: "24/03/2025", dataISO: "2025-03-24", hora: "15:25", plantonista: "VALDOMIRO", cliente: "VILA GALÉ", tipo: "QUEBRA", veiculoPrevisto: "101318", veiculoSubstituido: "102016", tipoQuebra: "PNEU", status: "EM_ANDAMENTO", descricao: "O motorista ligou informando que o pneu dianteiro baixou" },
  { id: 4, data: "24/03/2025", dataISO: "2025-03-24", hora: "10:25", plantonista: "VALDOMIRO", cliente: "MONTE RODOVIAS", tipo: "ATRASO", veiculoPrevisto: "304", veiculoSubstituido: null, tipoQuebra: null, status: "PENDENTE", descricao: "O carro 304 desceu para serviço de alinhamento" },
  { id: 5, data: "07/01/2025", dataISO: "2025-01-07", hora: "03:30", plantonista: "MACARIO", cliente: "JEEP", tipo: "QUEBRA", veiculoPrevisto: "121904", veiculoSubstituido: "121928", tipoQuebra: "MECANICA", status: "CONCLUIDO", descricao: "Veículo 121904 com dificuldade para encher o balão" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "CONCLUIDO": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1"><CheckCircle className="h-3 w-3" />Concluído</Badge>;
    case "EM_ANDAMENTO": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1"><Clock className="h-3 w-3" />Em Andamento</Badge>;
    case "PENDENTE": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1"><AlertTriangle className="h-3 w-3" />Pendente</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const getTypeBadge = (type: string) => {
  const colors: Record<string, string> = { QUEBRA: "bg-red-500", SOCORRO: "bg-orange-500", ATRASO: "bg-amber-500", INFORMAÇÃO: "bg-blue-500" };
  return <Badge className={`${colors[type] || "bg-gray-500"} text-white`}>{type}</Badge>;
};

export default function Ocorrencias() {
  const { toast } = useToast();
  const [ocorrencias, setOcorrencias] = useState(initialOccurrences);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Modals
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<typeof initialOccurrences[0] | null>(null);
  const [editForm, setEditForm] = useState({ status: "", descricao: "" });

  const filtered = useMemo(() => {
    return ocorrencias.filter((occ) => {
      const matchesSearch = occ.veiculoPrevisto.includes(searchTerm) || occ.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || occ.plantonista.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || occ.status === statusFilter;
      const matchesType = typeFilter === "all" || occ.tipo === typeFilter;
      const matchesDateStart = !dataInicio || occ.dataISO >= dataInicio;
      const matchesDateEnd = !dataFim || occ.dataISO <= dataFim;
      return matchesSearch && matchesStatus && matchesType && matchesDateStart && matchesDateEnd;
    });
  }, [ocorrencias, searchTerm, statusFilter, typeFilter, dataInicio, dataFim]);

  const stats = useMemo(() => ({
    total: filtered.length,
    concluidas: filtered.filter((o) => o.status === "CONCLUIDO").length,
    emAndamento: filtered.filter((o) => o.status === "EM_ANDAMENTO").length,
    pendentes: filtered.filter((o) => o.status === "PENDENTE").length,
  }), [filtered]);

  const handleView = (occ: typeof initialOccurrences[0]) => { setSelected(occ); setDetalhesOpen(true); };
  const handleEdit = (occ: typeof initialOccurrences[0]) => { setSelected(occ); setEditForm({ status: occ.status, descricao: occ.descricao }); setEditOpen(true); };
  const handleDelete = (occ: typeof initialOccurrences[0]) => { setSelected(occ); setExcluirOpen(true); };

  const confirmEdit = () => {
    if (!selected) return;
    setOcorrencias((prev) => prev.map((o) => o.id === selected.id ? { ...o, status: editForm.status, descricao: editForm.descricao } : o));
    toast({ title: "Ocorrência atualizada!", description: `#${selected.id} salva com sucesso.` });
    setEditOpen(false);
  };

  const confirmDelete = () => {
    if (!selected) return;
    setOcorrencias((prev) => prev.filter((o) => o.id !== selected.id));
    toast({ title: "Ocorrência excluída", description: `#${selected.id} removida.` });
    setExcluirOpen(false);
  };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "Relatório de Ocorrências",
      periodo: dataInicio && dataFim ? { inicio: dataInicio, fim: dataFim } : undefined,
      resumo: [
        { label: "Total", valor: stats.total.toString() },
        { label: "Concluídas", valor: stats.concluidas.toString() },
        { label: "Em Andamento", valor: stats.emAndamento.toString() },
        { label: "Pendentes", valor: stats.pendentes.toString() },
      ],
      colunas: ["Data", "Hora", "Plantonista", "Cliente", "Tipo", "Veículo", "Status"],
      dados: filtered.map((o) => [o.data, o.hora, o.plantonista, o.cliente, o.tipo, o.veiculoPrevisto, o.status]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Modals */}
      {selected && (
        <>
          <DetalhesDialog
            open={detalhesOpen}
            onOpenChange={setDetalhesOpen}
            titulo={`Ocorrência #${selected.id}`}
            subtitulo={`${selected.data} às ${selected.hora}`}
            campos={[
              { label: "Plantonista", valor: selected.plantonista },
              { label: "Cliente", valor: selected.cliente },
              { label: "Tipo", valor: selected.tipo, badge: true },
              { label: "Status", valor: selected.status, badge: true },
              { label: "Veículo Previsto", valor: `#${selected.veiculoPrevisto}` },
              { label: "Veículo Substituído", valor: selected.veiculoSubstituido ? `#${selected.veiculoSubstituido}` : "N/A" },
              { label: "Tipo Quebra", valor: selected.tipoQuebra || "N/A" },
              { label: "Descrição", valor: selected.descricao },
            ]}
          />
          <ConfirmarExclusaoDialog
            open={excluirOpen}
            onOpenChange={setExcluirOpen}
            descricao={`Excluir a ocorrência #${selected.id} (${selected.tipo} - ${selected.cliente})?`}
            onConfirmar={confirmDelete}
          />
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Ocorrência #{selected?.id}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={editForm.descricao} onChange={(e) => setEditForm((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={confirmEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarCSVDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        titulo="Ocorrências"
        colunasEsperadas={["data", "hora", "plantonista", "cliente", "tipo", "veiculo_previsto", "status", "descricao"]}
        onImportar={(dados) => {
          const novos = dados.map((d, i) => ({
            id: Date.now() + i,
            data: d.data || "",
            dataISO: "",
            hora: d.hora || "",
            plantonista: d.plantonista || "",
            cliente: d.cliente || "",
            tipo: d.tipo || "",
            veiculoPrevisto: d.veiculo_previsto || "",
            veiculoSubstituido: null as string | null,
            tipoQuebra: null as string | null,
            status: d.status || "PENDENTE",
            descricao: d.descricao || "",
          }));
          setOcorrencias((prev) => [...novos, ...prev]);
        }}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Ocorrências</h1>
          <p className="page-description">Gerencie todas as ocorrências registradas pelo CCO</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />Importar
          </Button>
          <Button variant="outline" onClick={handleRelatorio}>
            <FileText className="mr-2 h-4 w-4" />Relatório
          </Button>
          <Link to="/ocorrencias/nova">
            <Button><Plus className="mr-2 h-4 w-4" />Nova Ocorrência</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards - Dynamic */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total filtrado</p></div><AlertTriangle className="h-8 w-8 text-muted-foreground/50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-green-600">{stats.concluidas}</p><p className="text-sm text-muted-foreground">Concluídas</p></div><CheckCircle className="h-8 w-8 text-green-500/50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-amber-600">{stats.emAndamento}</p><p className="text-sm text-muted-foreground">Em andamento</p></div><Clock className="h-8 w-8 text-amber-500/50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-red-600">{stats.pendentes}</p><p className="text-sm text-muted-foreground">Pendentes</p></div><AlertTriangle className="h-8 w-8 text-red-500/50" /></div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por veículo, cliente ou plantonista..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="QUEBRA">Quebra</SelectItem>
                <SelectItem value="SOCORRO">Socorro</SelectItem>
                <SelectItem value="ATRASO">Atraso</SelectItem>
                <SelectItem value="INFORMAÇÃO">Informação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-full md:w-[150px]" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            <Input type="date" className="w-full md:w-[150px]" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="data-table-header">
                <TableHead className="w-[100px]">Data/Hora</TableHead>
                <TableHead>Plantonista</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Tipo Quebra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((occurrence) => (
                <TableRow key={occurrence.id} className="data-table-row">
                  <TableCell className="font-mono text-sm"><div>{occurrence.data}</div><div className="text-muted-foreground">{occurrence.hora}</div></TableCell>
                  <TableCell className="font-medium">{occurrence.plantonista}</TableCell>
                  <TableCell>{occurrence.cliente}</TableCell>
                  <TableCell>{getTypeBadge(occurrence.tipo)}</TableCell>
                  <TableCell><div className="font-mono">#{occurrence.veiculoPrevisto}</div>{occurrence.veiculoSubstituido && <div className="text-xs text-muted-foreground">→ #{occurrence.veiculoSubstituido}</div>}</TableCell>
                  <TableCell>{occurrence.tipoQuebra ? <span className="text-sm">{occurrence.tipoQuebra}</span> : <span className="text-muted-foreground">N/A</span>}</TableCell>
                  <TableCell>{getStatusBadge(occurrence.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(occurrence)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(occurrence)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(occurrence)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
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
