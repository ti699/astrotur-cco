import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, Download, Upload, MoreHorizontal, Eye, FileText, CheckCircle, Clock, AlertTriangle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

type AvariaStatus = "ABERTA" | "EM_ANALISE" | "EM_MANUTENCAO" | "RESOLVIDA";

interface Avaria {
  id: number;
  veiculo_id: number;
  veiculo_placa?: string;
  veiculo_frota?: string;
  motorista_id?: number;
  motorista_nome?: string;
  tipo_avaria: string;
  descricao?: string;
  status: AvariaStatus;
  partes_afetadas: string[];
  motivo_atraso?: string;
  critica: boolean;
  data_resolucao?: string;
  created_at: string;
}

const STATUS_MAP: Record<AvariaStatus, { label: string; cls: string; icon: typeof Clock }> = {
  ABERTA:        { label: "Aberta",        cls: "bg-red-100 text-red-800",    icon: AlertTriangle },
  EM_ANALISE:    { label: "Em AnÃ¡lise",    cls: "bg-amber-100 text-amber-800", icon: Clock },
  EM_MANUTENCAO: { label: "Em ManutenÃ§Ã£o", cls: "bg-blue-100 text-blue-800",  icon: Clock },
  RESOLVIDA:     { label: "Resolvida",     cls: "bg-green-100 text-green-800", icon: CheckCircle },
};

const getStatusBadge = (status: string) => {
  const info = STATUS_MAP[status as AvariaStatus] ?? { label: status, cls: "bg-gray-100 text-gray-800", icon: Clock };
  const Icon = info.icon;
  return <Badge className={`${info.cls} hover:${info.cls} gap-1`}><Icon className="h-3 w-3" />{info.label}</Badge>;
};

const TIPOS_AVARIA = ["CURVÃƒO", "COLISÃƒO", "VIDRO", "LATARIA", "RETROVISOR", "PARA-CHOQUE", "FAROL/LANTERNA", "OUTROS"];

export default function Avarias() {
  const { toast } = useToast();
  const [avarias, setAvarias] = useState<Avaria[]>([]);
  const [veiculosList, setVeiculosList] = useState<{ id: number; placa: string; numero_frota?: string }[]>([]);
  const [motoristasList, setMotoristasList] = useState<{ id: number; nome: string; matricula: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selectedAvaria, setSelectedAvaria] = useState<Avaria | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Nova avaria form
  const [novaForm, setNovaForm] = useState({
    veiculo_id: "",
    motorista_id: "",
    tipo_avaria: "",
    descricao: "",
    critica: false,
  });

  const mapRow = (r: Record<string, unknown>): Avaria => ({
    id: r.id as number,
    veiculo_id: r.veiculo_id as number,
    veiculo_placa: r.veiculo_placa as string | undefined,
    veiculo_frota: r.veiculo_frota as string | undefined,
    motorista_id: r.motorista_id as number | undefined,
    motorista_nome: r.motorista_nome as string | undefined,
    tipo_avaria: (r.tipo_avaria as string) || '',
    descricao: r.descricao as string | undefined,
    status: ((r.status as string) || 'ABERTA') as AvariaStatus,
    partes_afetadas: (r.partes_afetadas as string[]) || [],
    motivo_atraso: r.motivo_atraso as string | undefined,
    critica: Boolean(r.critica),
    data_resolucao: r.data_resolucao as string | undefined,
    created_at: (r.created_at as string) || '',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: aData }, { data: vData }, { data: mData }] = await Promise.all([
          api.get('/avarias'),
          api.get('/veiculos'),
          api.get('/motoristas'),
        ]);
        setAvarias((aData || []).map((r: Record<string, unknown>) => mapRow(r)));
        setVeiculosList(vData || []);
        setMotoristasList(mData || []);
      } catch (e) {
        console.error('Erro ao carregar avarias:', e);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return avarias.filter((a) => {
      const placa = (a.veiculo_placa || '').toLowerCase();
      const motorista = (a.motorista_nome || '').toLowerCase();
      const tipo = (a.tipo_avaria || '').toLowerCase();
      const matchSearch = placa.includes(searchTerm.toLowerCase()) || motorista.includes(searchTerm.toLowerCase()) || tipo.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [avarias, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    abertas: filtered.filter((a) => a.status === "ABERTA").length,
    emAnalise: filtered.filter((a) => a.status === "EM_ANALISE").length,
    emManutencao: filtered.filter((a) => a.status === "EM_MANUTENCAO").length,
    criticas: filtered.filter((a) => a.critica).length,
  }), [filtered]);

  const handleCriar = async () => {
    if (!novaForm.veiculo_id || !novaForm.tipo_avaria) {
      toast({ title: "Campos obrigatÃ³rios", description: "Selecione veÃ­culo e tipo de avaria.", variant: "destructive" });
      return;
    }
    try {
      const { data: row } = await api.post('/avarias', {
        veiculo_id: parseInt(novaForm.veiculo_id),
        motorista_id: novaForm.motorista_id ? parseInt(novaForm.motorista_id) : null,
        tipo_avaria: novaForm.tipo_avaria,
        descricao: novaForm.descricao || null,
        critica: novaForm.critica,
      });
      setAvarias((prev) => [mapRow(row as Record<string, unknown>), ...prev]);
      toast({ title: "Avaria registrada!", description: `VeÃ­culo ${veiculosList.find((v) => v.id === parseInt(novaForm.veiculo_id))?.placa || novaForm.veiculo_id}` });
      setWorkflowOpen(false);
      setNovaForm({ veiculo_id: "", motorista_id: "", tipo_avaria: "", descricao: "", critica: false });
    } catch (error) {
      console.error('Erro ao criar avaria:', error);
      toast({ title: "Erro ao registrar avaria", variant: "destructive" });
    }
  };

  const handleAvancarStatus = async (avaria: Avaria) => {
    const nextStatus: Record<AvariaStatus, AvariaStatus | null> = {
      ABERTA: "EM_ANALISE",
      EM_ANALISE: "EM_MANUTENCAO",
      EM_MANUTENCAO: "RESOLVIDA",
      RESOLVIDA: null,
    };
    const next = nextStatus[avaria.status];
    if (!next) return;
    try {
      const { data: row } = await api.patch(`/avarias/${avaria.id}`, {
        status: next,
        ...(next === 'RESOLVIDA' ? { data_resolucao: new Date().toISOString() } : {}),
      });
      setAvarias((prev) => prev.map((a) => a.id === avaria.id ? mapRow(row as Record<string, unknown>) : a));
      toast({ title: `Status atualizado â†’ ${STATUS_MAP[next].label}` });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "RelatÃ³rio de Avarias",
      resumo: [
        { label: "Total", valor: stats.total.toString() },
        { label: "Abertas", valor: stats.abertas.toString() },
        { label: "Em AnÃ¡lise", valor: stats.emAnalise.toString() },
        { label: "Em ManutenÃ§Ã£o", valor: stats.emManutencao.toString() },
        { label: "CrÃ­ticas", valor: stats.criticas.toString() },
      ],
      colunas: ["VeÃ­culo", "Motorista", "Tipo", "CrÃ­tica", "Status", "Data"],
      dados: filtered.map((a) => [
        a.veiculo_placa || String(a.veiculo_id),
        a.motorista_nome || '-',
        a.tipo_avaria,
        a.critica ? 'Sim' : 'NÃ£o',
        a.status,
        new Date(a.created_at).toLocaleDateString('pt-BR'),
      ]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Nova Avaria Dialog */}
      <Dialog open={workflowOpen} onOpenChange={setWorkflowOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Nova Avaria</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>VeÃ­culo *</Label>
              <Select value={novaForm.veiculo_id} onValueChange={(v) => setNovaForm((p) => ({ ...p, veiculo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o veÃ­culo" /></SelectTrigger>
                <SelectContent>{veiculosList.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.placa}{v.numero_frota ? ` - ${v.numero_frota}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motorista (opcional)</Label>
              <Select value={novaForm.motorista_id} onValueChange={(v) => setNovaForm((p) => ({ ...p, motorista_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">â€” Nenhum â€”</SelectItem>
                  {motoristasList.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.nome} ({m.matricula})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Avaria *</Label>
              <Select value={novaForm.tipo_avaria} onValueChange={(v) => setNovaForm((p) => ({ ...p, tipo_avaria: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>{TIPOS_AVARIA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>DescriÃ§Ã£o</Label>
              <Textarea value={novaForm.descricao} onChange={(e) => setNovaForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descreva a avaria..." />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="critica" checked={novaForm.critica} onCheckedChange={(v) => setNovaForm((p) => ({ ...p, critica: Boolean(v) }))} />
              <Label htmlFor="critica">Avaria crÃ­tica</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkflowOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriar}>Registrar Avaria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes Dialog */}
      <Dialog open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes da Avaria</DialogTitle></DialogHeader>
          {selectedAvaria && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground uppercase">VeÃ­culo</p><p className="font-mono font-bold">{selectedAvaria.veiculo_placa || selectedAvaria.veiculo_id}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Motorista</p><p className="font-medium">{selectedAvaria.motorista_nome || 'â€”'}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Tipo</p><p>{selectedAvaria.tipo_avaria}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">CrÃ­tica</p><p>{selectedAvaria.critica ? 'Sim' : 'NÃ£o'}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Status</p>{getStatusBadge(selectedAvaria.status)}</div>
                <div><p className="text-xs text-muted-foreground uppercase">Data</p><p>{new Date(selectedAvaria.created_at).toLocaleDateString('pt-BR')}</p></div>
              </div>
              {selectedAvaria.descricao && <div><p className="text-xs text-muted-foreground uppercase">DescriÃ§Ã£o</p><p>{selectedAvaria.descricao}</p></div>}
              {selectedAvaria.partes_afetadas?.length > 0 && <div><p className="text-xs text-muted-foreground uppercase">Partes afetadas</p><p>{selectedAvaria.partes_afetadas.join(', ')}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Avarias" colunasEsperadas={["veiculo_id", "tipo_avaria", "descricao"]} onImportar={() => {}} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">GestÃ£o de Avarias</h1>
          <p className="page-description">Controle e acompanhamento de avarias da frota</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />RelatÃ³rio</Button>
          <Button onClick={() => setWorkflowOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova Avaria</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-red-600">{stats.abertas}</p><p className="text-sm text-muted-foreground">Abertas</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{stats.emAnalise}</p><p className="text-sm text-muted-foreground">Em AnÃ¡lise</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-blue-600">{stats.emManutencao}</p><p className="text-sm text-muted-foreground">Em ManutenÃ§Ã£o</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-red-500" /><div><p className="text-2xl font-bold text-red-600">{stats.criticas}</p><p className="text-sm text-muted-foreground">CrÃ­ticas</p></div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por veÃ­culo, motorista ou tipo..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ABERTA">Aberta</SelectItem>
                <SelectItem value="EM_ANALISE">Em AnÃ¡lise</SelectItem>
                <SelectItem value="EM_MANUTENCAO">Em ManutenÃ§Ã£o</SelectItem>
                <SelectItem value="RESOLVIDA">Resolvida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando avarias...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="data-table-header">
                  <TableHead>VeÃ­culo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CrÃ­tica</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma avaria encontrada</TableCell></TableRow>
                ) : (
                  filtered.map((avaria) => (
                    <TableRow key={avaria.id} className="data-table-row">
                      <TableCell className="font-mono font-semibold text-primary">{avaria.veiculo_placa || `#${avaria.veiculo_id}`}{avaria.veiculo_frota ? ` (${avaria.veiculo_frota})` : ''}</TableCell>
                      <TableCell>{avaria.motorista_nome || 'â€”'}</TableCell>
                      <TableCell>{avaria.tipo_avaria}</TableCell>
                      <TableCell>{avaria.critica ? <Badge className="bg-red-100 text-red-800">CrÃ­tica</Badge> : <span className="text-muted-foreground">â€”</span>}</TableCell>
                      <TableCell>{getStatusBadge(avaria.status)}</TableCell>
                      <TableCell className="font-mono text-sm">{new Date(avaria.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedAvaria(avaria); setDetalhesOpen(true); }}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                            {avaria.status !== 'RESOLVIDA' && (
                              <DropdownMenuItem onClick={() => handleAvancarStatus(avaria)}><CheckCircle className="mr-2 h-4 w-4" />AvanÃ§ar Status</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
