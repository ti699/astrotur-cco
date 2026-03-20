import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, MoreHorizontal, Eye, Fuel, Clock, CheckCircle, FileText, Upload, Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface Abastecimento {
  id: number;
  veiculo_id: number;
  veiculo_placa?: string;
  veiculo_frota?: string;
  portaria_movimentacao_id?: number;
  portaria_data_hora?: string;
  status_abastecimento: "ABASTECIDO" | "NAO_ABASTECIDO";
  status_lavagem: "LAVADO" | "NAO_LAVADO";
  concluido: boolean;
  created_at: string;
}

export default function Abastecimento() {
  const { toast } = useToast();
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [veiculosList, setVeiculosList] = useState<{ id: number; placa: string; numero_frota?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [novaOpen, setNovaOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ veiculo_id: "" });

  const mapRow = (r: Record<string, unknown>): Abastecimento => ({
    id: r.id as number,
    veiculo_id: r.veiculo_id as number,
    veiculo_placa: r.veiculo_placa as string | undefined,
    veiculo_frota: r.veiculo_frota as string | undefined,
    portaria_movimentacao_id: r.portaria_movimentacao_id as number | undefined,
    portaria_data_hora: r.portaria_data_hora as string | undefined,
    status_abastecimento: ((r.status_abastecimento as string) || 'NAO_ABASTECIDO') as Abastecimento['status_abastecimento'],
    status_lavagem: ((r.status_lavagem as string) || 'NAO_LAVADO') as Abastecimento['status_lavagem'],
    concluido: Boolean(r.concluido),
    created_at: (r.created_at as string) || '',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: aData }, { data: vData }] = await Promise.all([
          api.get('/abastecimentos'),
          api.get('/veiculos'),
        ]);
        setAbastecimentos((aData || []).map((r: Record<string, unknown>) => mapRow(r)));
        setVeiculosList(vData || []);
      } catch (e) {
        console.error('Erro ao carregar abastecimentos:', e);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return abastecimentos.filter((a) => {
      const placa = (a.veiculo_placa || '').toLowerCase();
      const frota = (a.veiculo_frota || '').toLowerCase();
      const matchSearch = placa.includes(searchTerm.toLowerCase()) || frota.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all"
        || (statusFilter === "concluido" && a.concluido)
        || (statusFilter === "pendente" && !a.concluido);
      return matchSearch && matchStatus;
    });
  }, [abastecimentos, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    abastecidos: filtered.filter((a) => a.status_abastecimento === 'ABASTECIDO').length,
    lavados: filtered.filter((a) => a.status_lavagem === 'LAVADO').length,
    concluidos: filtered.filter((a) => a.concluido).length,
  }), [filtered]);

  const handleCriar = async () => {
    if (!form.veiculo_id) {
      toast({ title: "Selecione um veÃ­culo", variant: "destructive" });
      return;
    }
    try {
      const { data: row } = await api.post('/abastecimentos', { veiculo_id: parseInt(form.veiculo_id) });
      setAbastecimentos((prev) => [mapRow(row as Record<string, unknown>), ...prev]);
      const placa = veiculosList.find((v) => v.id === parseInt(form.veiculo_id))?.placa || form.veiculo_id;
      toast({ title: "Registro criado!", description: `VeÃ­culo ${placa}` });
      setNovaOpen(false);
      setForm({ veiculo_id: "" });
    } catch (error) {
      toast({ title: "Erro ao criar registro", variant: "destructive" });
      console.error(error);
    }
  };

  const handleAbastecer = async (a: Abastecimento) => {
    const novo = a.status_abastecimento === 'ABASTECIDO' ? 'NAO_ABASTECIDO' : 'ABASTECIDO';
    try {
      const { data: row } = await api.patch(`/abastecimentos/${a.id}`, { status_abastecimento: novo });
      setAbastecimentos((prev) => prev.map((x) => x.id === a.id ? mapRow(row as Record<string, unknown>) : x));
      toast({ title: novo === 'ABASTECIDO' ? "VeÃ­culo marcado como abastecido" : "Status revertido" });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleLavar = async (a: Abastecimento) => {
    const novo = a.status_lavagem === 'LAVADO' ? 'NAO_LAVADO' : 'LAVADO';
    try {
      const { data: row } = await api.patch(`/abastecimentos/${a.id}`, { status_lavagem: novo });
      setAbastecimentos((prev) => prev.map((x) => x.id === a.id ? mapRow(row as Record<string, unknown>) : x));
      toast({ title: novo === 'LAVADO' ? "VeÃ­culo marcado como lavado" : "Status revertido" });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleConcluir = async (a: Abastecimento) => {
    try {
      const { data: row } = await api.patch(`/abastecimentos/${a.id}`, { concluido: !a.concluido });
      setAbastecimentos((prev) => prev.map((x) => x.id === a.id ? mapRow(row as Record<string, unknown>) : x));
      toast({ title: a.concluido ? "Registro reaberto" : "Registro concluÃ­do!" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "RelatÃ³rio de Abastecimento / Lavagem",
      resumo: [
        { label: "Total", valor: stats.total.toString() },
        { label: "Abastecidos", valor: stats.abastecidos.toString() },
        { label: "Lavados", valor: stats.lavados.toString() },
        { label: "ConcluÃ­dos", valor: stats.concluidos.toString() },
      ],
      colunas: ["VeÃ­culo", "Frota", "Abastecimento", "Lavagem", "ConcluÃ­do", "Data"],
      dados: filtered.map((a) => [
        a.veiculo_placa || String(a.veiculo_id),
        a.veiculo_frota || '-',
        a.status_abastecimento === 'ABASTECIDO' ? 'Abastecido' : 'Pendente',
        a.status_lavagem === 'LAVADO' ? 'Lavado' : 'Pendente',
        a.concluido ? 'Sim' : 'NÃ£o',
        new Date(a.created_at).toLocaleDateString('pt-BR'),
      ]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Nova entrada */}
      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Registro de Abastecimento/Lavagem</DialogTitle><DialogDescription>Crie um registro de acompanhamento para o veÃ­culo.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>VeÃ­culo *</Label>
              <Select value={form.veiculo_id} onValueChange={(v) => setForm({ veiculo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o veÃ­culo" /></SelectTrigger>
                <SelectContent>{veiculosList.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.placa}{v.numero_frota ? ` - ${v.numero_frota}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriar}><Fuel className="mr-2 h-4 w-4" />Criar Registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Abastecimentos" colunasEsperadas={["veiculo_id"]} onImportar={() => {}} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="page-title">Abastecimento &amp; Lavagem</h1><p className="page-description">Acompanhe o status de abastecimento e lavagem dos veÃ­culos</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" size="sm" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />RelatÃ³rio</Button>
          <Button size="sm" onClick={() => setNovaOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo Registro</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Registros</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-primary">{stats.abastecidos}</p><p className="text-sm text-muted-foreground">Abastecidos</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-blue-600">{stats.lavados}</p><p className="text-sm text-muted-foreground">Lavados</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-600">{stats.concluidos}</p><p className="text-sm text-muted-foreground">ConcluÃ­dos</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar placa ou frota..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pendente">Pendentes</SelectItem><SelectItem value="concluido">ConcluÃ­dos</SelectItem></SelectContent></Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando registros...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="data-table-header">
                <TableHead>VeÃ­culo</TableHead>
                <TableHead>Frota</TableHead>
                <TableHead>Abastecimento</TableHead>
                <TableHead>Lavagem</TableHead>
                <TableHead>ConcluÃ­do</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id} className="data-table-row">
                    <TableCell className="font-mono font-bold text-primary">{a.veiculo_placa || `#${a.veiculo_id}`}</TableCell>
                    <TableCell className="font-mono text-sm">{a.veiculo_frota || 'â€”'}</TableCell>
                    <TableCell>
                      {a.status_abastecimento === 'ABASTECIDO'
                        ? <Badge className="bg-green-100 text-green-800 gap-1"><Fuel className="h-3 w-3" />Abastecido</Badge>
                        : <Badge className="bg-amber-100 text-amber-800 gap-1"><Clock className="h-3 w-3" />Pendente</Badge>}
                    </TableCell>
                    <TableCell>
                      {a.status_lavagem === 'LAVADO'
                        ? <Badge className="bg-blue-100 text-blue-800 gap-1"><Droplets className="h-3 w-3" />Lavado</Badge>
                        : <Badge className="bg-gray-100 text-gray-800 gap-1"><Clock className="h-3 w-3" />Pendente</Badge>}
                    </TableCell>
                    <TableCell>
                      {a.concluido
                        ? <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" />Sim</Badge>
                        : <Badge className="bg-gray-100 text-gray-800">NÃ£o</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{new Date(a.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAbastecer(a)}>
                            <Fuel className="mr-2 h-4 w-4" />{a.status_abastecimento === 'ABASTECIDO' ? 'Desfazer abastecimento' : 'Marcar abastecido'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleLavar(a)}>
                            <Droplets className="mr-2 h-4 w-4" />{a.status_lavagem === 'LAVADO' ? 'Desfazer lavagem' : 'Marcar lavado'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConcluir(a)}>
                            <CheckCircle className="mr-2 h-4 w-4" />{a.concluido ? 'Reabrir' : 'Concluir'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
