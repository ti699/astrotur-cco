import { useState, useMemo } from "react";
import {
  Plus, Search, Upload, MoreHorizontal, Eye, Edit, Trash2, Truck, FileText, Loader2,
} from "lucide-react";
import { useVeiculos, useUpdateVeiculo, useDeleteVeiculo, type Veiculo } from "@/services/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DetalhesDialog } from "@/components/shared/DetalhesDialog";
import { ConfirmarExclusaoDialog } from "@/components/shared/ConfirmarExclusaoDialog";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";

type VeiculoStatus = "EM_OPERACAO" | "NA_GARAGEM" | "EM_MANUTENCAO" | "EM_ABASTECIMENTO" | "INATIVO";

const statusConfig: Record<VeiculoStatus, { cls: string; label: string }> = {
  EM_OPERACAO: { cls: "bg-green-100 text-green-800", label: "Em Operação" },
  NA_GARAGEM: { cls: "bg-blue-100 text-blue-800", label: "Na Garagem" },
  EM_MANUTENCAO: { cls: "bg-amber-100 text-amber-800", label: "Em Manutenção" },
  EM_ABASTECIMENTO: { cls: "bg-purple-100 text-purple-800", label: "Em Abastecimento" },
  INATIVO: { cls: "bg-gray-100 text-gray-800", label: "Inativo" },
};

const getStatusBadge = (status: VeiculoStatus) => {
  const info = statusConfig[status] || { cls: "", label: status };
  return <Badge className={`${info.cls} hover:${info.cls}`}>{info.label}</Badge>;
};

export default function Veiculos() {
  const { toast } = useToast();
  const { data: veiculosData, isLoading } = useVeiculos();
  const updateVeiculo = useUpdateVeiculo();
  const deleteVeiculo = useDeleteVeiculo();
  const veiculos: Veiculo[] = veiculosData ?? [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Veiculo | null>(null);
  const [editForm, setEditForm] = useState({ cliente: "", kmAtual: "", status: "", localizacao: "" });

  const filtered = useMemo(() => {
    return veiculos.filter((v) => {
      const frota = (v.numero_frota ?? "").toString();
      const placa = (v.placa ?? "").toLowerCase();
      const modelo = (v.modelo ?? "").toLowerCase();
      const matchSearch = frota.includes(searchTerm) || placa.includes(searchTerm.toLowerCase()) || modelo.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || v.status === statusFilter;
      const matchTipo = tipoFilter === "all" || (v.tipo ?? "").toLowerCase().includes(tipoFilter);
      return matchSearch && matchStatus && matchTipo;
    });
  }, [veiculos, searchTerm, statusFilter, tipoFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    emOperacao: filtered.filter((v) => v.status === "EM_OPERACAO").length,
    naGaragem: filtered.filter((v) => v.status === "NA_GARAGEM").length,
    emManutencao: filtered.filter((v) => v.status === "EM_MANUTENCAO").length,
    emAbastecimento: filtered.filter((v) => v.status === "EM_ABASTECIMENTO").length,
  }), [filtered]);

  const handleView = (v: Veiculo) => { setSelected(v); setDetalhesOpen(true); };
  const handleEdit = (v: Veiculo) => {
    setSelected(v);
    setEditForm({ cliente: v.cliente_nome ?? "", kmAtual: (v.km_atual ?? "").toString(), status: v.status ?? "", localizacao: v.localizacao ?? "" });
    setEditOpen(true);
  };
  const handleDelete = (v: Veiculo) => { setSelected(v); setExcluirOpen(true); };

  const confirmEdit = () => {
    if (!selected) return;
    updateVeiculo.mutate({ id: selected.id, cliente_nome: editForm.cliente, km_atual: parseInt(editForm.kmAtual) || 0, status: editForm.status, localizacao: editForm.localizacao }, {
      onSuccess: () => { toast({ title: "Veículo atualizado!" }); setEditOpen(false); },
      onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
    });
  };

  const confirmDelete = () => {
    if (!selected) return;
    deleteVeiculo.mutate(selected.id, {
      onSuccess: () => { toast({ title: "Veículo desativado" }); setExcluirOpen(false); },
      onError: () => toast({ title: "Erro ao desativar", variant: "destructive" }),
    });
  };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "Relatório de Frota - Localização dos Veículos",
      resumo: [
        { label: "Total", valor: stats.total.toString() },
        { label: "Em Operação", valor: stats.emOperacao.toString() },
        { label: "Na Garagem", valor: stats.naGaragem.toString() },
        { label: "Manutenção", valor: stats.emManutencao.toString() },
        { label: "Abastecimento", valor: stats.emAbastecimento.toString() },
      ],
      colunas: ["Nº Frota", "Placa", "Tipo", "Modelo", "Cliente", "Status", "Localização", "KM"],
      dados: filtered.map((v) => [v.numeroFrota, v.placa, v.tipo, v.modelo, v.cliente, statusConfig[v.status].label, v.localizacao, v.kmAtual.toLocaleString()]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {selected && (
        <>
          <DetalhesDialog open={detalhesOpen} onOpenChange={setDetalhesOpen} titulo={`Veículo #${selected.numero_frota}`} subtitulo={selected.modelo ?? ""}
            campos={[
              { label: "Placa", valor: selected.placa },
              { label: "Tipo", valor: selected.tipo ?? "" },
              { label: "Ano", valor: (selected.ano ?? "").toString() },
              { label: "Cliente", valor: selected.cliente_nome ?? "" },
              { label: "KM Atual", valor: `${(selected.km_atual ?? 0).toLocaleString()} km` },
              { label: "Status", valor: statusConfig[selected.status as VeiculoStatus]?.label ?? selected.status, badge: true },
              { label: "Localização", valor: selected.localizacao ?? "" },
            ]}
          />
          <ConfirmarExclusaoDialog open={excluirOpen} onOpenChange={setExcluirOpen} titulo="Desativar Veículo" descricao={`Desativar veículo #${selected.numero_frota}?`} onConfirmar={confirmDelete} />
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Veículo #{selected?.numeroFrota}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Cliente</Label><Input value={editForm.cliente} onChange={(e) => setEditForm((p) => ({ ...p, cliente: e.target.value }))} /></div>
            <div className="space-y-2"><Label>KM Atual</Label><Input type="number" value={editForm.kmAtual} onChange={(e) => setEditForm((p) => ({ ...p, kmAtual: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Localização</Label><Input value={editForm.localizacao} onChange={(e) => setEditForm((p) => ({ ...p, localizacao: e.target.value }))} placeholder="Ex: Garagem Recife" /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="EM_OPERACAO">Em Operação</SelectItem>
              <SelectItem value="NA_GARAGEM">Na Garagem</SelectItem>
              <SelectItem value="EM_MANUTENCAO">Em Manutenção</SelectItem>
              <SelectItem value="EM_ABASTECIMENTO">Em Abastecimento</SelectItem>
              <SelectItem value="INATIVO">Inativo</SelectItem>
            </SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button><Button onClick={confirmEdit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Veículos" colunasEsperadas={["numero_frota", "placa", "tipo", "modelo", "ano", "cliente", "km_atual", "status", "localizacao"]} onImportar={() => {
        toast({ title: "Importação via CSV", description: "Envie o arquivo para o backend para importação em lote." });
        setImportOpen(false);
      }} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="page-title">Veículos</h1><p className="page-description">Cadastro completo e localização da frota</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" size="sm" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />Relatório</Button>
          <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo Veículo</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-600">{stats.emOperacao}</p><p className="text-sm text-muted-foreground">Em operação</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-blue-600">{stats.naGaragem}</p><p className="text-sm text-muted-foreground">Na garagem</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{stats.emManutencao}</p><p className="text-sm text-muted-foreground">Manutenção</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-purple-600">{stats.emAbastecimento}</p><p className="text-sm text-muted-foreground">Abastecimento</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar número, placa ou modelo..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="EM_OPERACAO">Em Operação</SelectItem>
            <SelectItem value="NA_GARAGEM">Na Garagem</SelectItem>
            <SelectItem value="EM_MANUTENCAO">Manutenção</SelectItem>
            <SelectItem value="EM_ABASTECIMENTO">Abastecimento</SelectItem>
            <SelectItem value="INATIVO">Inativos</SelectItem>
          </SelectContent></Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}><SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="ônibus">Ônibus</SelectItem><SelectItem value="micro">Micro-ônibus</SelectItem><SelectItem value="van">Van</SelectItem></SelectContent></Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="data-table-header"><TableHead>Nº Frota</TableHead><TableHead>Placa</TableHead><TableHead>Modelo</TableHead><TableHead>Cliente</TableHead><TableHead>KM</TableHead><TableHead>Status</TableHead><TableHead>Localização</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum veículo encontrado</TableCell></TableRow>
            ) : filtered.map((veiculo) => (
              <TableRow key={veiculo.id} className="data-table-row">
                <TableCell className="font-mono font-bold text-primary">#{veiculo.numero_frota}</TableCell>
                <TableCell className="font-mono">{veiculo.placa}</TableCell>
                <TableCell>{veiculo.modelo}</TableCell>
                <TableCell>{veiculo.cliente_nome}</TableCell>
                <TableCell className="font-mono">{(veiculo.km_atual ?? 0).toLocaleString()}</TableCell>
                <TableCell>{getStatusBadge((veiculo.status ?? "NA_GARAGEM") as VeiculoStatus)}</TableCell>
                <TableCell className="text-sm">{veiculo.localizacao}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(veiculo)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(veiculo)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(veiculo)}><Trash2 className="mr-2 h-4 w-4" />Desativar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
