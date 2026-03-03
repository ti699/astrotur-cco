import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Search, Download, Upload, MoreHorizontal, Eye, Edit, Trash2, AlertTriangle, Clock, CheckCircle, FileText, Loader2,
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
import { useOcorrencias, useUpdateOcorrencia, useDeleteOcorrencia, type Ocorrencia } from "@/services/useApi";

// Dados mock removidos — todos os dados vêm do backend via API

const getStatusBadge = (status: string) => {
  const normalized = status?.toUpperCase();
  switch (normalized) {
    case "CONCLUIDO": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1"><CheckCircle className="h-3 w-3" />Concluído</Badge>;
    case "EM_ANDAMENTO": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1"><Clock className="h-3 w-3" />Em Andamento</Badge>;
    case "PENDENTE": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1"><AlertTriangle className="h-3 w-3" />Pendente</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const getTypeBadge = (type: string) => {
  const colors: Record<string, string> = { QUEBRA: "bg-red-500", Quebra: "bg-red-500", SOCORRO: "bg-orange-500", Socorro: "bg-orange-500", ATRASO: "bg-amber-500", Atraso: "bg-amber-500", INFORMAÇÃO: "bg-blue-500", "Informação": "bg-blue-500" };
  return <Badge className={`${colors[type] || "bg-gray-500"} text-white`}>{type || "—"}</Badge>;
};

export default function Ocorrencias() {
  const { toast } = useToast();
  const { data: ocorrencias = [], isLoading } = useOcorrencias();
  const updateOcorrencia = useUpdateOcorrencia();
  const deleteOcorrencia = useDeleteOcorrencia();

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
  const [selected, setSelected] = useState<Ocorrencia | null>(null);
  const [editForm, setEditForm] = useState({ status: "", descricao: "" });

  const filtered = useMemo(() => {
    return ocorrencias.filter((occ) => {
      const veiculo = occ.veiculo_placa || "";
      const cliente = occ.cliente_nome || "";
      const monitor = occ.monitor_nome || "";
      const tipo = occ.tipo_ocorrencia || occ.tipo_quebra_nome || "";
      const statusVal = (occ.status || "").toUpperCase();
      const dateStr = (occ.data_ocorrencia || occ.data_quebra || "").split("T")[0];

      const matchesSearch = !searchTerm ||
        veiculo.includes(searchTerm) ||
        cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        monitor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || statusVal === statusFilter.toUpperCase();
      const matchesType = typeFilter === "all" || tipo.toUpperCase().includes(typeFilter.toUpperCase());
      const matchesDateStart = !dataInicio || dateStr >= dataInicio;
      const matchesDateEnd = !dataFim || dateStr <= dataFim;
      return matchesSearch && matchesStatus && matchesType && matchesDateStart && matchesDateEnd;
    });
  }, [ocorrencias, searchTerm, statusFilter, typeFilter, dataInicio, dataFim]);

  const stats = useMemo(() => ({
    total: filtered.length,
    concluidas: filtered.filter((o) => (o.status || "").toUpperCase() === "CONCLUIDO").length,
    emAndamento: filtered.filter((o) => (o.status || "").toUpperCase() === "EM_ANDAMENTO").length,
    pendentes: filtered.filter((o) => (o.status || "").toUpperCase() === "PENDENTE").length,
  }), [filtered]);

  const handleView = (occ: Ocorrencia) => { setSelected(occ); setDetalhesOpen(true); };
  const handleEdit = (occ: Ocorrencia) => { setSelected(occ); setEditForm({ status: occ.status || "", descricao: occ.descricao || "" }); setEditOpen(true); };
  const handleDelete = (occ: Ocorrencia) => { setSelected(occ); setExcluirOpen(true); };

  const confirmEdit = () => {
    if (!selected) return;
    updateOcorrencia.mutate({ id: selected.id, status: editForm.status, descricao: editForm.descricao });
    setEditOpen(false);
  };

  const confirmDelete = () => {
    if (!selected) return;
    deleteOcorrencia.mutate(selected.id);
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
      colunas: ["Data", "Hora", "Monitor", "Cliente", "Tipo", "Veículo", "Status"],
      dados: filtered.map((o) => [
        (o.data_ocorrencia || o.data_quebra || "").split("T")[0],
        (o.data_ocorrencia || "").slice(11, 16),
        o.monitor_nome || "",
        o.cliente_nome || "",
        o.tipo_ocorrencia || o.tipo_quebra_nome || "",
        o.veiculo_placa || "",
        o.status || "",
      ]),
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
            titulo={`Ocorrência #${selected?.numero_ocorrencia || selected?.numero || selected?.id}`}
            subtitulo={(selected?.data_ocorrencia || selected?.data_quebra || "").slice(0, 10)}
            campos={[
              { label: "Monitor", valor: selected?.monitor_nome || "N/A" },
              { label: "Cliente", valor: selected?.cliente_nome || "N/A" },
              { label: "Tipo", valor: selected?.tipo_ocorrencia || selected?.tipo_quebra_nome || "N/A", badge: true },
              { label: "Status", valor: selected?.status || "N/A", badge: true },
              { label: "Veículo", valor: selected?.veiculo_placa || "N/A" },
              { label: "Veículo Substituto", valor: selected?.veiculo_substituto_placa || "N/A" },
              { label: "Tipo Quebra", valor: selected?.tipo_quebra_nome || "N/A" },
              { label: "Descrição", valor: selected?.descricao || "" },
            ]}
          />
          <ConfirmarExclusaoDialog
            open={excluirOpen}
            onOpenChange={setExcluirOpen}
            descricao={`Excluir a ocorrência #${selected?.numero_ocorrencia || selected?.id} (${selected?.tipo_ocorrencia || ""} - ${selected?.cliente_nome || ""})?`}
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
          // TODO: chamar API para importação em lote
          toast({ title: `${dados.length} registros lidos`, description: "Importação em lote via API será implementada em breve." });
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
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma ocorrência encontrada.</TableCell></TableRow>
              ) : filtered.map((occurrence) => {
                const tipo = occurrence.tipo_ocorrencia || occurrence.tipo_quebra_nome || "";
                const dateStr = (occurrence.data_ocorrencia || occurrence.data_quebra || "").split("T")[0];
                const hora = (occurrence.data_ocorrencia || "").slice(11, 16) || "";
                return (
                <TableRow key={occurrence.id} className="data-table-row">
                  <TableCell className="font-mono text-sm"><div>{dateStr}</div><div className="text-muted-foreground">{hora}</div></TableCell>
                  <TableCell className="font-medium">{occurrence.monitor_nome || "—"}</TableCell>
                  <TableCell>{occurrence.cliente_nome || "—"}</TableCell>
                  <TableCell>{getTypeBadge(tipo)}</TableCell>
                  <TableCell><div className="font-mono">{occurrence.veiculo_placa || "—"}</div>{occurrence.veiculo_substituto_placa && <div className="text-xs text-muted-foreground">→ {occurrence.veiculo_substituto_placa}</div>}</TableCell>
                  <TableCell>{occurrence.tipo_quebra_nome ? <span className="text-sm">{occurrence.tipo_quebra_nome}</span> : <span className="text-muted-foreground">N/A</span>}</TableCell>
                  <TableCell>{getStatusBadge(occurrence.status || "")}</TableCell>
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
              );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
