import { useState, useMemo } from "react";
import {
  Plus, Search, Upload, MoreHorizontal, Eye, Edit, Trash2, Truck, FileText,
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
import { DetalhesDialog } from "@/components/shared/DetalhesDialog";
import { ConfirmarExclusaoDialog } from "@/components/shared/ConfirmarExclusaoDialog";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";

type VeiculoStatus = "EM_OPERACAO" | "NA_GARAGEM" | "EM_MANUTENCAO" | "EM_ABASTECIMENTO" | "INATIVO";

const initialVeiculos = [
  { id: 1, numeroFrota: "121904", placa: "OXM-1234", tipo: "Ônibus", modelo: "Mercedes-Benz OF 1721", ano: 2020, cliente: "JEEP", status: "EM_OPERACAO" as VeiculoStatus, kmAtual: 245680, localizacao: "Goiana/PE" },
  { id: 2, numeroFrota: "102104", placa: "OXN-5678", tipo: "Ônibus", modelo: "Volkswagen 17.230 OD", ano: 2019, cliente: "HDH", status: "NA_GARAGEM" as VeiculoStatus, kmAtual: 312450, localizacao: "Garagem Recife" },
  { id: 3, numeroFrota: "2536", placa: "OXP-9012", tipo: "Micro-ônibus", modelo: "Volkswagen 9.160 OD", ano: 2021, cliente: "MONTE RODOVIAS", status: "EM_MANUTENCAO" as VeiculoStatus, kmAtual: 89230, localizacao: "Oficina Central" },
  { id: 4, numeroFrota: "101318", placa: "OXQ-3456", tipo: "Ônibus", modelo: "Mercedes-Benz OF 1519", ano: 2018, cliente: "VILA GALÉ", status: "EM_ABASTECIMENTO" as VeiculoStatus, kmAtual: 456780, localizacao: "Posto Shell BR-101" },
];

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
  const [veiculos, setVeiculos] = useState(initialVeiculos);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [mesFilter, setMesFilter] = useState("all");
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<typeof initialVeiculos[0] | null>(null);
  const [editForm, setEditForm] = useState({ cliente: "", kmAtual: "", status: "", localizacao: "" });

  const filtered = useMemo(() => {
    return veiculos.filter((v) => {
      const matchSearch = v.numeroFrota.includes(searchTerm) || v.placa.toLowerCase().includes(searchTerm.toLowerCase()) || v.modelo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || v.status === statusFilter;
      const matchTipo = tipoFilter === "all" || v.tipo.toLowerCase().includes(tipoFilter);
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

  const handleView = (v: typeof initialVeiculos[0]) => { setSelected(v); setDetalhesOpen(true); };
  const handleEdit = (v: typeof initialVeiculos[0]) => { setSelected(v); setEditForm({ cliente: v.cliente, kmAtual: v.kmAtual.toString(), status: v.status, localizacao: v.localizacao }); setEditOpen(true); };
  const handleDelete = (v: typeof initialVeiculos[0]) => { setSelected(v); setExcluirOpen(true); };

  const confirmEdit = () => {
    if (!selected) return;
    setVeiculos((prev) => prev.map((v) => v.id === selected.id ? { ...v, cliente: editForm.cliente, kmAtual: parseInt(editForm.kmAtual) || v.kmAtual, status: editForm.status as VeiculoStatus, localizacao: editForm.localizacao } : v));
    toast({ title: "Veículo atualizado!" }); setEditOpen(false);
  };

  const confirmDelete = () => {
    if (!selected) return;
    setVeiculos((prev) => prev.map((v) => v.id === selected.id ? { ...v, status: "INATIVO" as VeiculoStatus } : v));
    toast({ title: "Veículo desativado" }); setExcluirOpen(false);
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
          <DetalhesDialog open={detalhesOpen} onOpenChange={setDetalhesOpen} titulo={`Veículo #${selected.numeroFrota}`} subtitulo={selected.modelo}
            campos={[
              { label: "Placa", valor: selected.placa },
              { label: "Tipo", valor: selected.tipo },
              { label: "Ano", valor: selected.ano.toString() },
              { label: "Cliente", valor: selected.cliente },
              { label: "KM Atual", valor: `${selected.kmAtual.toLocaleString()} km` },
              { label: "Status", valor: statusConfig[selected.status].label, badge: true },
              { label: "Localização", valor: selected.localizacao },
            ]}
          />
          <ConfirmarExclusaoDialog open={excluirOpen} onOpenChange={setExcluirOpen} titulo="Desativar Veículo" descricao={`Desativar veículo #${selected.numeroFrota}?`} onConfirmar={confirmDelete} />
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

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Veículos" colunasEsperadas={["numero_frota", "placa", "tipo", "modelo", "ano", "cliente", "km_atual", "status", "localizacao"]} onImportar={(dados) => {
        const novos = dados.map((d, i) => ({ id: Date.now() + i, numeroFrota: d.numero_frota || "", placa: d.placa || "", tipo: d.tipo || "Ônibus", modelo: d.modelo || "", ano: parseInt(d.ano) || 2020, cliente: d.cliente || "", status: (d.status || "NA_GARAGEM") as VeiculoStatus, kmAtual: parseInt(d.km_atual) || 0, localizacao: d.localizacao || "Garagem" }));
        setVeiculos((prev) => [...novos, ...prev]);
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
            {filtered.map((veiculo) => (
              <TableRow key={veiculo.id} className="data-table-row">
                <TableCell className="font-mono font-bold text-primary">#{veiculo.numeroFrota}</TableCell>
                <TableCell className="font-mono">{veiculo.placa}</TableCell>
                <TableCell>{veiculo.modelo}</TableCell>
                <TableCell>{veiculo.cliente}</TableCell>
                <TableCell className="font-mono">{veiculo.kmAtual.toLocaleString()}</TableCell>
                <TableCell>{getStatusBadge(veiculo.status)}</TableCell>
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
