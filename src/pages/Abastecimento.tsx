import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, MoreHorizontal, Eye, Fuel, Clock, CheckCircle, FileText, Upload, TrendingUp,
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
import { DetalhesDialog } from "@/components/shared/DetalhesDialog";
import { ImportarCSVDialog } from "@/components/shared/ImportarCSVDialog";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";

interface Abastecimento {
  id: number;
  veiculo: string;
  motorista: string;
  data: string;
  litros: number;
  tipoCombustivel: string;
  kmAtual: number;
  posto: string;
  valor: number;
  retornou: boolean;
}

export default function Abastecimento() {
  const { toast } = useToast();
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [retornoFilter, setRetornoFilter] = useState("all");
  const [novaOpen, setNovaOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Abastecimento | null>(null);
  const [form, setForm] = useState({ veiculo: "", motorista: "", litros: "", tipoCombustivel: "Diesel S10", kmAtual: "", posto: "", valor: "" });

  // Carregar abastecimentos do backend
  useEffect(() => {
    const carregarAbastecimentos = async () => {
      try {
        setLoading(true);
        const response = await api.get('/abastecimentos');
        setAbastecimentos(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar abastecimentos:', error);
        setAbastecimentos([]);
      } finally {
        setLoading(false);
      }
    };
    carregarAbastecimentos();
  }, []);

  const filtered = useMemo(() => {
    return abastecimentos.filter((a) => {
      const matchSearch = a.veiculo.includes(searchTerm) || a.motorista.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRetorno = retornoFilter === "all" || (retornoFilter === "retornou" ? a.retornou : !a.retornou);
      return matchSearch && matchRetorno;
    });
  }, [abastecimentos, searchTerm, retornoFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    litrosTotal: filtered.reduce((s, a) => s + a.litros, 0),
    valorTotal: filtered.reduce((s, a) => s + a.valor, 0),
    pendentes: filtered.filter((a) => !a.retornou).length,
  }), [filtered]);

  const handleCriar = async () => {
    try {
      const response = await api.post('/abastecimentos', {
        veiculo: form.veiculo,
        motorista: form.motorista,
        litros: parseFloat(form.litros),
        tipoCombustivel: form.tipoCombustivel,
        kmAtual: parseInt(form.kmAtual),
        posto: form.posto,
        valor: parseFloat(form.valor),
      });
      setAbastecimentos((prev) => [response.data, ...prev]);
      toast({ title: "Abastecimento registrado!", description: `Veículo #${form.veiculo}` });
      setNovaOpen(false);
      setForm({ veiculo: "", motorista: "", litros: "", tipoCombustivel: "Diesel S10", kmAtual: "", posto: "", valor: "" });
    } catch (error) {
      toast({ title: "Erro ao criar abastecimento", variant: "destructive" });
      console.error(error);
    }
  };

  const handleRetorno = async (a: Abastecimento) => {
    try {
      const response = await api.patch(`/abastecimentos/${a.id}`, {
        retornou: true,
      });
      setAbastecimentos((prev) => prev.map((x) => x.id === a.id ? response.data : x));
      toast({ title: "Retorno confirmado!", description: `Veículo #${a.veiculo} retornou do abastecimento.` });
    } catch (error) {
      toast({ title: "Erro ao confirmar retorno", variant: "destructive" });
      console.error(error);
    }
  };

  const handleView = (a: Abastecimento) => { setSelected(a); setDetalhesOpen(true); };

  const handleRelatorio = async () => {
    await gerarRelatorioPDF({
      titulo: "Relatório de Abastecimentos",
      resumo: [
        { label: "Total", valor: stats.total.toString() },
        { label: "Litros Total", valor: `${stats.litrosTotal.toLocaleString()} L` },
        { label: "Valor Total", valor: `R$ ${stats.valorTotal.toFixed(2)}` },
        { label: "Pendentes Retorno", valor: stats.pendentes.toString() },
      ],
      colunas: ["Veículo", "Motorista", "Data", "Litros", "Combustível", "Posto", "Valor", "Retornou"],
      dados: filtered.map((a) => [a.veiculo, a.motorista, a.data, a.litros.toString(), a.tipoCombustivel, a.posto, `R$ ${a.valor.toFixed(2)}`, a.retornou ? "Sim" : "Não"]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {selected && (
        <DetalhesDialog open={detalhesOpen} onOpenChange={setDetalhesOpen} titulo={`Abastecimento - Veículo #${selected.veiculo}`} subtitulo={selected.data}
          campos={[
            { label: "Motorista", valor: selected.motorista },
            { label: "Litros", valor: `${selected.litros} L` },
            { label: "Combustível", valor: selected.tipoCombustivel },
            { label: "KM Atual", valor: `${selected.kmAtual.toLocaleString()} km` },
            { label: "Posto", valor: selected.posto },
            { label: "Valor", valor: `R$ ${selected.valor.toFixed(2)}` },
            { label: "Retornou", valor: selected.retornou ? "Sim" : "Pendente", badge: true },
          ]}
        />
      )}

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Abastecimento</DialogTitle><DialogDescription>Registre a saída do veículo para abastecimento.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Veículo *</Label><Input value={form.veiculo} onChange={(e) => setForm((p) => ({ ...p, veiculo: e.target.value }))} placeholder="Ex: 121904" /></div>
              <div className="space-y-2"><Label>Motorista</Label><Input value={form.motorista} onChange={(e) => setForm((p) => ({ ...p, motorista: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Litros</Label><Input type="number" value={form.litros} onChange={(e) => setForm((p) => ({ ...p, litros: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Combustível</Label><Select value={form.tipoCombustivel} onValueChange={(v) => setForm((p) => ({ ...p, tipoCombustivel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Diesel S10">Diesel S10</SelectItem><SelectItem value="Diesel S500">Diesel S500</SelectItem><SelectItem value="GNV">GNV</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>KM Atual</Label><Input type="number" value={form.kmAtual} onChange={(e) => setForm((p) => ({ ...p, kmAtual: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Posto</Label><Input value={form.posto} onChange={(e) => setForm((p) => ({ ...p, posto: e.target.value }))} placeholder="Nome do posto" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriar}><Fuel className="mr-2 h-4 w-4" />Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Abastecimentos" colunasEsperadas={["veiculo", "motorista", "litros", "combustivel", "km_atual", "posto", "valor"]} onImportar={() => {}} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="page-title">Abastecimento</h1><p className="page-description">Controle de abastecimentos e retorno de veículos</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" size="sm" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />Relatório</Button>
          <Button size="sm" onClick={() => setNovaOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo Abastecimento</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Registros</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-primary">{stats.litrosTotal.toLocaleString()} L</p><p className="text-sm text-muted-foreground">Litros total</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">R$ {stats.valorTotal.toFixed(0)}</p><p className="text-sm text-muted-foreground">Custo total</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-red-600">{stats.pendentes}</p><p className="text-sm text-muted-foreground">Pendentes retorno</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar veículo ou motorista..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Select value={retornoFilter} onValueChange={setRetornoFilter}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Retorno" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="retornou">Retornaram</SelectItem><SelectItem value="pendente">Pendentes</SelectItem></SelectContent></Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="data-table-header"><TableHead>Veículo</TableHead><TableHead>Motorista</TableHead><TableHead>Data</TableHead><TableHead>Litros</TableHead><TableHead>Posto</TableHead><TableHead>Valor</TableHead><TableHead>Retorno</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id} className="data-table-row">
                <TableCell className="font-mono font-bold text-primary">#{a.veiculo}</TableCell>
                <TableCell>{a.motorista}</TableCell>
                <TableCell className="font-mono text-sm">{a.data}</TableCell>
                <TableCell>{a.litros} L</TableCell>
                <TableCell className="max-w-[150px] truncate">{a.posto}</TableCell>
                <TableCell className="font-mono">R$ {a.valor.toFixed(2)}</TableCell>
                <TableCell>
                  {a.retornou ? (
                    <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" />Sim</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 gap-1"><Clock className="h-3 w-3" />Pendente</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(a)}><Eye className="mr-2 h-4 w-4" />Detalhes</DropdownMenuItem>
                      {!a.retornou && <DropdownMenuItem onClick={() => handleRetorno(a)}><CheckCircle className="mr-2 h-4 w-4" />Confirmar Retorno</DropdownMenuItem>}
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
