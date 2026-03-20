import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, Download, Upload, MoreHorizontal, Eye, Edit, Trash2, Users, AlertTriangle, History, FileText,
} from "lucide-react";
import { HistoricoConduta } from "@/components/motoristas/HistoricoConduta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DetalhesDialog } from "@/components/shared/DetalhesDialog";
import { ConfirmarExclusaoDialog } from "@/components/shared/ConfirmarExclusaoDialog";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

const initialMotoristas: any[] = [];

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = { ATIVO: "bg-green-100 text-green-800", FERIAS: "bg-blue-100 text-blue-800", AFASTADO: "bg-amber-100 text-amber-800", DESLIGADO: "bg-gray-100 text-gray-800" };
  const labels: Record<string, string> = { ATIVO: "Ativo", FERIAS: "Férias", AFASTADO: "Afastado", DESLIGADO: "Desligado" };
  return <Badge className={`${map[status] || ""} hover:${map[status] || ""}`}>{labels[status] || status}</Badge>;
};

export default function Motoristas() {
  const { toast } = useToast();
  const [motoristas, setMotoristas] = useState(initialMotoristas);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoForm, setNovoForm] = useState({ nome: "", matricula: "", cpf: "", cnh: "D", cnhValidade: "", telefone: "", status: "ATIVO" });
  const [motoristaSelecionado, setMotoristaSelecionado] = useState<{ id: string; nome: string; matricula: string } | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", telefone: "", status: "" });

  const mapRow = (r: Record<string, unknown>) => ({
    id: r.id,
    nome: (r.nome as string) || '',
    matricula: (r.matricula as string) || '',
    cpf: (r.cpf as string) || '',
    cnh: (r.cnh as string) || '',
    cnhValidade: (r.cnh_validade as string) || '',
    telefone: (r.telefone as string) || '',
    status: (r.status as string) || 'ATIVO',
    avarias: 0,
    cnhAlerta: false,
  });

  // Load motoristas via backend API
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/motoristas');
        setMotoristas((data || []).map((r: Record<string, unknown>) => mapRow(r)));
      } catch (e) {
        console.error('Erro ao carregar motoristas:', e);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return motoristas.filter((m) => {
      const matchSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || m.matricula.includes(searchTerm);
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [motoristas, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    ativos: filtered.filter((m) => m.status === "ATIVO").length,
    cnhVencendo: filtered.filter((m) => (m as any).cnhAlerta).length,
    ferias: filtered.filter((m) => m.status === "FERIAS").length,
  }), [filtered]);

  const handleVerHistorico = (m: any) => { setMotoristaSelecionado({ id: m.id.toString(), nome: m.nome, matricula: m.matricula }); setHistoricoOpen(true); };
  const handleView = (m: any) => { setSelected(m); setDetalhesOpen(true); };
  const handleEdit = (m: any) => { setSelected(m); setEditForm({ nome: m.nome, telefone: m.telefone, status: m.status }); setEditOpen(true); };
  const handleDelete = (m: any) => { setSelected(m); setExcluirOpen(true); };

  const confirmNovo = async () => {
    try {
      const { data: row } = await api.post('/motoristas', {
        nome: novoForm.nome,
        matricula: novoForm.matricula,
        cpf: novoForm.cpf,
        cnh: novoForm.cnh,
        cnhValidade: novoForm.cnhValidade,
        telefone: novoForm.telefone,
        status: novoForm.status,
      });
      setMotoristas((prev) => [mapRow(row as Record<string, unknown>), ...prev]);
      toast({ title: "Motorista cadastrado!", description: novoForm.nome });
      setNovoOpen(false);
      setNovoForm({ nome: "", matricula: "", cpf: "", cnh: "D", cnhValidade: "", telefone: "", status: "ATIVO" });
    } catch (error) {
      console.error("Erro ao cadastrar motorista:", error);
      toast({ title: "Erro", description: "Falha ao cadastrar motorista", variant: "destructive" });
    }
  };

  const confirmEdit = async () => {
    if (!selected) return;
    try {
      const { data: row } = await api.patch(`/motoristas/${selected.id}`, {
        nome: editForm.nome,
        telefone: editForm.telefone,
        status: editForm.status,
      });
      setMotoristas((prev) => prev.map((m) => m.id === selected.id ? mapRow(row as Record<string, unknown>) : m));
      toast({ title: "Motorista atualizado!" });
      setEditOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar motorista:", error);
      toast({ title: "Erro", description: "Falha ao atualizar motorista", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    try {
      await api.patch(`/motoristas/${selected.id}`, { status: 'DESLIGADO' });
      setMotoristas((prev) => prev.map((m) => m.id === selected.id ? { ...m, status: 'DESLIGADO' } : m));
      toast({ title: "Motorista desativado" });
      setExcluirOpen(false);
    } catch (error) {
      console.error("Erro ao desativar motorista:", error);
      toast({ title: "Erro", description: "Falha ao desativar motorista", variant: "destructive" });
    }
  };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "Relatório de Motoristas",
      resumo: [
        { label: "Total", valor: stats.total.toString() },
        { label: "Ativos", valor: stats.ativos.toString() },
        { label: "CNH Vencendo", valor: stats.cnhVencendo.toString() },
        { label: "Férias", valor: stats.ferias.toString() },
      ],
      colunas: ["Nome", "Matrícula", "CNH", "Validade", "Telefone", "Avarias", "Status"],
      dados: filtered.map((m) => [m.nome, m.matricula, m.cnh, m.cnhValidade, m.telefone, m.avarias.toString(), m.status]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {motoristaSelecionado && <HistoricoConduta open={historicoOpen} onOpenChange={setHistoricoOpen} motorista={motoristaSelecionado} />}
      {selected && (
        <>
          <DetalhesDialog open={detalhesOpen} onOpenChange={setDetalhesOpen} titulo={selected.nome} subtitulo={`Matrícula: ${selected.matricula}`}
            campos={[
              { label: "CPF", valor: selected.cpf },
              { label: "CNH", valor: selected.cnh },
              { label: "Validade CNH", valor: selected.cnhValidade },
              { label: "Telefone", valor: selected.telefone },
              { label: "Avarias", valor: selected.avarias.toString() },
              { label: "Status", valor: selected.status, badge: true },
            ]}
          />
          <ConfirmarExclusaoDialog open={excluirOpen} onOpenChange={setExcluirOpen} titulo="Desativar Motorista" descricao={`Desativar ${selected.nome}? O motorista será marcado como desligado.`} onConfirmar={confirmDelete} />
        </>
      )}

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Motorista</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome *</Label><Input placeholder="Nome completo" value={novoForm.nome} onChange={(e) => setNovoForm((p) => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Matrícula</Label><Input placeholder="Ex: 03486" value={novoForm.matricula} onChange={(e) => setNovoForm((p) => ({ ...p, matricula: e.target.value }))} /></div>
              <div className="space-y-2"><Label>CPF</Label><Input placeholder="000.000.000-00" value={novoForm.cpf} onChange={(e) => setNovoForm((p) => ({ ...p, cpf: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Categoria CNH</Label><Select value={novoForm.cnh} onValueChange={(v) => setNovoForm((p) => ({ ...p, cnh: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="B">B</SelectItem><SelectItem value="D">D</SelectItem><SelectItem value="E">E</SelectItem><SelectItem value="A/D">A/D</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Validade CNH</Label><Input placeholder="DD/MM/AAAA" value={novoForm.cnhValidade} onChange={(e) => setNovoForm((p) => ({ ...p, cnhValidade: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(81) 99999-0000" value={novoForm.telefone} onChange={(e) => setNovoForm((p) => ({ ...p, telefone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={novoForm.status} onValueChange={(v) => setNovoForm((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ATIVO">Ativo</SelectItem><SelectItem value="FERIAS">Férias</SelectItem><SelectItem value="AFASTADO">Afastado</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <Button onClick={confirmNovo} disabled={!novoForm.nome}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Motorista</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={editForm.nome} onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={editForm.telefone} onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ATIVO">Ativo</SelectItem><SelectItem value="FERIAS">Férias</SelectItem><SelectItem value="AFASTADO">Afastado</SelectItem><SelectItem value="DESLIGADO">Desligado</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button><Button onClick={confirmEdit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Motoristas" colunasEsperadas={["nome", "matricula", "cpf", "cnh", "cnh_validade", "telefone", "status"]} onImportar={(dados) => {
        const novos = dados.map((d, i) => ({ id: Date.now() + i, nome: d.nome || "", matricula: d.matricula || "", cpf: d.cpf || "", cnh: d.cnh || "", cnhValidade: d.cnh_validade || "", telefone: d.telefone || "", status: d.status || "ATIVO", avarias: 0 }));
        setMotoristas((prev) => [...novos, ...prev]);
      }} />

      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Cadastro de Motoristas</h1><p className="page-description">Gerencie os motoristas da frota</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />Relatório</Button>
          <Button onClick={() => setNovoOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo Motorista</Button>
        </div>
      </div>

      {/* Stats - Dynamic */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total de motoristas</p></div><Users className="h-8 w-8 text-muted-foreground/50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-600">{stats.ativos}</p><p className="text-sm text-muted-foreground">Ativos</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-amber-600">{stats.cnhVencendo}</p><p className="text-sm text-muted-foreground">CNH vencendo</p></div><AlertTriangle className="h-6 w-6 text-amber-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-blue-600">{stats.ferias}</p><p className="text-sm text-muted-foreground">Em férias</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card><CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por nome, matrícula..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="ATIVO">Ativos</SelectItem><SelectItem value="FERIAS">Férias</SelectItem><SelectItem value="AFASTADO">Afastados</SelectItem><SelectItem value="DESLIGADO">Desligados</SelectItem></SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      {/* Table */}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow className="data-table-header"><TableHead>Motorista</TableHead><TableHead>Matrícula</TableHead><TableHead>CNH</TableHead><TableHead>Validade CNH</TableHead><TableHead>Telefone</TableHead><TableHead>Avarias</TableHead><TableHead>Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((motorista) => (
              <TableRow key={motorista.id} className="data-table-row">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-sm">{motorista.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                    <div><p className="font-medium">{motorista.nome}</p><p className="text-xs text-muted-foreground">CPF: {motorista.cpf}</p></div>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{motorista.matricula}</TableCell>
                <TableCell>{motorista.cnh}</TableCell>
                <TableCell><div className="flex items-center gap-2"><span className={(motorista as any).cnhAlerta ? "text-red-600 font-medium" : ""}>{motorista.cnhValidade}</span>{(motorista as any).cnhAlerta && <AlertTriangle className="h-4 w-4 text-red-500" />}</div></TableCell>
                <TableCell>{motorista.telefone}</TableCell>
                <TableCell><Badge variant={motorista.avarias > 2 ? "destructive" : "secondary"}>{motorista.avarias}</Badge></TableCell>
                <TableCell>{getStatusBadge(motorista.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleVerHistorico(motorista)}><History className="mr-2 h-4 w-4" />Histórico de Conduta</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleView(motorista)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(motorista)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(motorista)}><Trash2 className="mr-2 h-4 w-4" />Desativar</DropdownMenuItem>
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
