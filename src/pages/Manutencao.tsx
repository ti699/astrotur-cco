import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, MoreHorizontal, Eye, Edit, Wrench, Clock, CheckCircle, AlertTriangle, FileText, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DetalhesDialog } from "@/components/shared/DetalhesDialog";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";

type ManutencaoStatus = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA";

interface Manutencao {
  id: number;
  veiculo: string;
  tipo: string;
  descricao: string;
  dataAbertura: string;
  dataConclusao?: string;
  responsavel: string;
  status: ManutencaoStatus;
  custo?: number;
  kmEntrada: number;
}

const getStatusBadge = (status: ManutencaoStatus) => {
  const map = {
    ABERTA: { cls: "bg-red-100 text-red-800", label: "Aberta", icon: AlertTriangle },
    EM_ANDAMENTO: { cls: "bg-amber-100 text-amber-800", label: "Em Andamento", icon: Clock },
    CONCLUIDA: { cls: "bg-green-100 text-green-800", label: "Concluída", icon: CheckCircle },
  };
  const info = map[status];
  const Icon = info.icon;
  return <Badge className={`${info.cls} hover:${info.cls} gap-1`}><Icon className="h-3 w-3" />{info.label}</Badge>;
};

export default function Manutencao() {
  const { toast } = useToast();
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [novaOpen, setNovaOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Manutencao | null>(null);
  const [form, setForm] = useState({ veiculo: "", tipo: "Preventiva", descricao: "", responsavel: "", kmEntrada: "" });

  // Carregar manutenções do backend
  useEffect(() => {
    const carregarManutencoes = async () => {
      try {
        setLoading(true);
        const response = await api.get('/manutencoes');
        setManutencoes(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar manutenções:', error);
        setManutencoes([]);
      } finally {
        setLoading(false);
      }
    };
    carregarManutencoes();
  }, []);

  const filtered = useMemo(() => {
    return manutencoes.filter((m) => {
      const matchSearch = m.veiculo.includes(searchTerm) || m.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [manutencoes, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    abertas: filtered.filter((m) => m.status === "ABERTA").length,
    emAndamento: filtered.filter((m) => m.status === "EM_ANDAMENTO").length,
    concluidas: filtered.filter((m) => m.status === "CONCLUIDA").length,
  }), [filtered]);

  const handleCriar = async () => {
    try {
      const response = await api.post('/manutencoes', {
        veiculo: form.veiculo,
        tipo: form.tipo,
        descricao: form.descricao,
        responsavel: form.responsavel,
        kmEntrada: parseInt(form.kmEntrada) || 0,
      });
      setManutencoes((prev) => [response.data, ...prev]);
      toast({ title: "Manutenção registrada!", description: `Veículo #${form.veiculo} enviado para manutenção.` });
      setNovaOpen(false);
      setForm({ veiculo: "", tipo: "Preventiva", descricao: "", responsavel: "", kmEntrada: "" });
    } catch (error) {
      toast({ title: "Erro ao criar manutenção", variant: "destructive" });
      console.error(error);
    }
  };

  const handleConcluir = async (m: Manutencao) => {
    try {
      const response = await api.patch(`/manutencoes/${m.id}`, {
        status: "CONCLUIDA",
        dataConclusao: new Date().toISOString().split("T")[0],
      });
      setManutencoes((prev) => prev.map((x) => x.id === m.id ? response.data : x));
      toast({ title: "Manutenção concluída!", description: `Veículo #${m.veiculo} liberado.` });
    } catch (error) {
      toast({ title: "Erro ao concluir manutenção", variant: "destructive" });
      console.error(error);
    }
  };

  const handleIniciar = async (m: Manutencao) => {
    try {
      const response = await api.patch(`/manutencoes/${m.id}`, {
        status: "EM_ANDAMENTO",
      });
      setManutencoes((prev) => prev.map((x) => x.id === m.id ? response.data : x));
      toast({ title: "Manutenção iniciada", description: `Veículo #${m.veiculo} em manutenção.` });
    } catch (error) {
      toast({ title: "Erro ao iniciar manutenção", variant: "destructive" });
      console.error(error);
    }
  };

  const handleView = (m: Manutencao) => { setSelected(m); setDetalhesOpen(true); };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "Relatório de Manutenções",
      resumo: [
        { label: "Total", valor: stats.total.toString() },
        { label: "Abertas", valor: stats.abertas.toString() },
        { label: "Em Andamento", valor: stats.emAndamento.toString() },
        { label: "Concluídas", valor: stats.concluidas.toString() },
      ],
      colunas: ["Veículo", "Tipo", "Descrição", "Data", "Responsável", "Status"],
      dados: filtered.map((m) => [m.veiculo, m.tipo, m.descricao, m.dataAbertura, m.responsavel, m.status]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {selected && (
        <DetalhesDialog open={detalhesOpen} onOpenChange={setDetalhesOpen} titulo={`Manutenção - Veículo #${selected.veiculo}`} subtitulo={selected.dataAbertura}
          campos={[
            { label: "Tipo", valor: selected.tipo, badge: true },
            { label: "Descrição", valor: selected.descricao },
            { label: "Responsável", valor: selected.responsavel },
            { label: "KM Entrada", valor: `${selected.kmEntrada.toLocaleString()} km` },
            { label: "Status", valor: selected.status, badge: true },
            { label: "Custo", valor: selected.custo ? `R$ ${selected.custo.toFixed(2)}` : "Pendente" },
            { label: "Data Conclusão", valor: selected.dataConclusao || "Em aberto" },
          ]}
        />
      )}

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Manutenção</DialogTitle><DialogDescription>Registre uma nova manutenção. O status do veículo será alterado automaticamente.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Veículo *</Label><Input value={form.veiculo} onChange={(e) => setForm((p) => ({ ...p, veiculo: e.target.value }))} placeholder="Ex: 121904" /></div>
              <div className="space-y-2"><Label>KM Entrada</Label><Input type="number" value={form.kmEntrada} onChange={(e) => setForm((p) => ({ ...p, kmEntrada: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo</Label><Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Preventiva">Preventiva</SelectItem><SelectItem value="Corretiva">Corretiva</SelectItem><SelectItem value="Emergencial">Emergencial</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))} placeholder="Oficina / Mecânico" /></div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o problema..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriar}><Wrench className="mr-2 h-4 w-4" />Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Manutenções" colunasEsperadas={["veiculo", "tipo", "descricao", "responsavel", "km_entrada"]} onImportar={() => {}} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="page-title">Manutenção</h1><p className="page-description">Controle de manutenções da frota</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" size="sm" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />Relatório</Button>
          <Button size="sm" onClick={() => setNovaOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova Manutenção</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-red-600">{stats.abertas}</p><p className="text-sm text-muted-foreground">Abertas</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{stats.emAndamento}</p><p className="text-sm text-muted-foreground">Em andamento</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-600">{stats.concluidas}</p><p className="text-sm text-muted-foreground">Concluídas</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar veículo ou descrição..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="ABERTA">Abertas</SelectItem><SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem><SelectItem value="CONCLUIDA">Concluídas</SelectItem></SelectContent></Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="data-table-header"><TableHead>Veículo</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id} className="data-table-row">
                <TableCell className="font-mono font-bold text-primary">#{m.veiculo}</TableCell>
                <TableCell><Badge variant="secondary">{m.tipo}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate">{m.descricao}</TableCell>
                <TableCell className="font-mono text-sm">{m.dataAbertura}</TableCell>
                <TableCell>{m.responsavel}</TableCell>
                <TableCell>{getStatusBadge(m.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(m)}><Eye className="mr-2 h-4 w-4" />Detalhes</DropdownMenuItem>
                      {m.status === "ABERTA" && <DropdownMenuItem onClick={() => handleIniciar(m)}><Wrench className="mr-2 h-4 w-4" />Iniciar</DropdownMenuItem>}
                      {m.status === "EM_ANDAMENTO" && <DropdownMenuItem onClick={() => handleConcluir(m)}><CheckCircle className="mr-2 h-4 w-4" />Concluir</DropdownMenuItem>}
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
