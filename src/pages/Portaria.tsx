import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, ArrowDownToLine, ArrowUpFromLine, Download, Upload, MoreHorizontal, Eye, Edit, Clock, FileText, Route, Mail, X
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
import { supabase } from "@/lib/supabase";
import { DashboardLocalizacaoVeiculos } from "@/components/portaria/DashboardLocalizacaoVeiculos";
import { FiltroEntradasCompacto } from "@/components/portaria/FiltroEntradasCompacto";
import { FiltroSaidasCompacto } from "@/components/portaria/FiltroSaidasCompacto";

interface EntradaRecord {
  id: number; dataHora: string; monitor: string; veiculo: string;
  kmEntrada: number; kmInicioRota: number; kmFimRota: number;
  motorista: string; cliente: string; localSaida: string;
  motivo: string; programado: boolean; descricao?: string;
}
interface SaidaRecord {
  id: number; dataHora: string; monitor: string; veiculo: string;
  kmSaida: number; motorista: string; destino: string; vistoriaConforme: boolean;
  observacoes?: string;
}

const motivosEntrada = ["RECOLHE NA GARAGEM", "MANUTENÇÃO", "ABASTECIMENTO", "SOLICITAÇÃO OPERAÇÃO"];
const monitores = ["VALDOMIRO", "MACARIO", "IRANILDO", "ANDERSON"];

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toBrDateTime = (value: unknown) => {
  if (!value) return "";
  const asDate = new Date(String(value));
  if (Number.isNaN(asDate.getTime())) return String(value);
  return asDate.toLocaleString("pt-BR");
};

const normalizeEntrada = (raw: any): EntradaRecord => ({
  id: toNumber(raw?.id),
  dataHora: toBrDateTime(raw?.dataHora ?? raw?.datahora ?? raw?.data_hora),
  monitor: raw?.monitor ?? "",
  veiculo: String(raw?.veiculo ?? ""),
  kmEntrada: toNumber(raw?.kmEntrada ?? raw?.kmentrada ?? raw?.km_entrada),
  kmInicioRota: toNumber(raw?.kmInicioRota ?? raw?.kminiciorota ?? raw?.km_inicio_rota),
  kmFimRota: toNumber(raw?.kmFimRota ?? raw?.kmfimrota ?? raw?.km_fim_rota),
  motorista: raw?.motorista ?? "",
  cliente: raw?.cliente ?? "",
  localSaida: raw?.localSaida ?? raw?.localsaida ?? raw?.local_saida ?? "",
  motivo: raw?.motivo ?? "",
  programado: Boolean(raw?.programado ?? true),
  descricao: raw?.descricao ?? "",
});

const normalizeSaida = (raw: any): SaidaRecord => ({
  id: toNumber(raw?.id),
  dataHora: toBrDateTime(raw?.dataHora ?? raw?.datahora ?? raw?.data_hora),
  monitor: raw?.monitor ?? "",
  veiculo: String(raw?.veiculo ?? ""),
  kmSaida: toNumber(raw?.kmSaida ?? raw?.kmsaida ?? raw?.km_saida),
  motorista: raw?.motorista ?? "",
  destino: raw?.destino ?? "",
  vistoriaConforme: Boolean(raw?.vistoriaConforme ?? raw?.vistoriaconforme ?? raw?.vistoria_conforme),
  observacoes: raw?.observacoes ?? "",
});

// Calcula KM morto refinado
const calcKmMorto = (entry: EntradaRecord) => {
  const kmSaidaGaragem = entry.kmInicioRota - 10;
  const garagemInicio = entry.kmInicioRota - kmSaidaGaragem;
  const fimGaragem = entry.kmEntrada - entry.kmFimRota;
  return { produtivo: entry.kmFimRota - entry.kmInicioRota, morto: garagemInicio + fimGaragem, total: entry.kmEntrada - kmSaidaGaragem };
};

export default function Portaria() {
        // Estado do modal de envio por e-mail
        const [emailModalOpen, setEmailModalOpen] = useState(false);
        const [emailDestinatarios, setEmailDestinatarios] = useState<string[]>([]);
        const [emailBusca, setEmailBusca] = useState("");
        const [emailAssunto, setEmailAssunto] = useState(`Relatório de Portaria — ${new Date().toLocaleDateString("pt-BR")}`);
        const [emailMensagem, setEmailMensagem] = useState("");
        const [emailEnviando, setEmailEnviando] = useState(false);
      // Estado dos filtros da aba Saídas
      const [filtrosSaidas, setFiltrosSaidas] = useState({
        busca: "",
        dataDe: null,
        dataAte: null,
        status: [],
        clientes: [],
        buscaCliente: "",
        monitores: [],
      });
      const limparFiltrosSaidas = () => setFiltrosSaidas({ busca: "", dataDe: null, dataAte: null, status: [], clientes: [], buscaCliente: "", monitores: [] });
    // Estado dos filtros da aba Entradas
    const [filtrosEntradas, setFiltrosEntradas] = useState({
      busca: "",
      dataDe: null,
      dataAte: null,
      status: [],
      clientes: [],
      buscaCliente: "",
      monitores: [],
    });
    // Opções mockadas (depois pode ser dinâmico)
    const opcoesStatus = ["Entrada", "Saída", "Em Operação", "Na Garagem"];
    const opcoesClientes = ["JEEP", "FIAT", "VOLKSWAGEN", "TOYOTA"];
    const opcoesMonitores = monitores;
    // Função de limpar filtros
    const limparFiltrosEntradas = () => setFiltrosEntradas({ busca: "", dataDe: null, dataAte: null, status: [], clientes: [], buscaCliente: "", monitores: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [entradas, setEntradas] = useState<EntradaRecord[]>([]);
  const [saidas, setSaidas] = useState<SaidaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [entradaDialogOpen, setEntradaDialogOpen] = useState(false);
  const [saidaDialogOpen, setSaidaDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntradaRecord | null>(null);
  const { toast } = useToast();

  // Form state: Entrada
  const [formEntrada, setFormEntrada] = useState({ dataHora: new Date().toISOString().slice(0, 16), monitor: "", veiculo: "", kmEntrada: "", kmInicioRota: "", kmFimRota: "", motorista: "", cliente: "", localSaida: "", motivo: "", descricao: "" });
  // Form state: Saída
  const [formSaida, setFormSaida] = useState({ dataHora: new Date().toISOString().slice(0, 16), monitor: "", veiculo: "", kmSaida: "", motorista: "", destino: "", vistoriaConforme: "sim", observacoes: "" });

  // Load entradas and saidas from Supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('portaria_movimentacoes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setEntradas(data.filter((r) => r.tipo === 'entrada').map(normalizeEntrada));
        setSaidas(data.filter((r) => r.tipo === 'saida').map(normalizeSaida));
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEntradas = useMemo(() => {
    return entradas.filter((e) =>
      e.veiculo.includes(searchTerm) || e.motorista.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entradas, searchTerm]);

  const filteredSaidas = useMemo(() => {
    return saidas.filter((s) =>
      s.veiculo.includes(searchTerm) || s.motorista.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [saidas, searchTerm]);

  const stats = useMemo(() => ({
    naGaragem: filteredEntradas.length,
    emOperacao: filteredSaidas.length,
    entradasHoje: filteredEntradas.length,
    saidasHoje: filteredSaidas.length,
  }), [filteredEntradas, filteredSaidas]);

  const handleViewEntry = (entry: EntradaRecord) => {
    setSelectedEntry(entry);
    setDetalhesOpen(true);
  };

  const handleRegistrarEntrada = async () => {
    if (!formEntrada.veiculo || !formEntrada.kmEntrada) {
      toast({ title: "Campos obrigatórios", description: "Preencha veículo e KM de entrada.", variant: "destructive" });
      return;
    }
    try {
      const { data: row, error } = await supabase.from('portaria_movimentacoes').insert({
        tipo: 'entrada',
        data_hora: formEntrada.dataHora ? new Date(formEntrada.dataHora).toISOString() : new Date().toISOString(),
        monitor: formEntrada.monitor,
        veiculo: formEntrada.veiculo,
        km_entrada: parseInt(formEntrada.kmEntrada) || 0,
        km_inicio_rota: parseInt(formEntrada.kmInicioRota) || 0,
        km_fim_rota: parseInt(formEntrada.kmFimRota) || 0,
        motorista: formEntrada.motorista,
        cliente: formEntrada.cliente,
        local_saida: formEntrada.localSaida,
        motivo: formEntrada.motivo,
        descricao: formEntrada.descricao,
      }).select().single();
      if (error) throw error;
      setEntradas((prev) => [normalizeEntrada(row), ...prev]);
      toast({ title: "Entrada registrada!", description: "A entrada do veículo foi registrada com sucesso." });
      setEntradaDialogOpen(false);
      setFormEntrada({ dataHora: new Date().toISOString().slice(0, 16), monitor: "", veiculo: "", kmEntrada: "", kmInicioRota: "", kmFimRota: "", motorista: "", cliente: "", localSaida: "", motivo: "", descricao: "" });
    } catch (error) {
      console.error("Erro ao registrar entrada:", error);
      toast({ title: "Erro", description: "Falha ao registrar entrada", variant: "destructive" });
    }
  };

  const handleRegistrarSaida = async () => {
    if (!formSaida.veiculo || !formSaida.kmSaida) {
      toast({ title: "Campos obrigatórios", description: "Preencha veículo e KM de saída.", variant: "destructive" });
      return;
    }
    try {
      const { data: row, error } = await supabase.from('portaria_movimentacoes').insert({
        tipo: 'saida',
        data_hora: formSaida.dataHora ? new Date(formSaida.dataHora).toISOString() : new Date().toISOString(),
        monitor: formSaida.monitor,
        veiculo: formSaida.veiculo,
        km_saida: parseInt(formSaida.kmSaida) || 0,
        motorista: formSaida.motorista,
        destino: formSaida.destino,
        vistoria_conforme: formSaida.vistoriaConforme === "sim",
        observacoes: formSaida.observacoes,
      }).select().single();
      if (error) throw error;
      setSaidas((prev) => [normalizeSaida(row), ...prev]);
      toast({ title: "Saída registrada!", description: "A saída do veículo foi registrada com sucesso." });
      setSaidaDialogOpen(false);
      setFormSaida({ dataHora: new Date().toISOString().slice(0, 16), monitor: "", veiculo: "", kmSaida: "", motorista: "", destino: "", vistoriaConforme: "sim", observacoes: "" });
    } catch (error) {
      console.error("Erro ao registrar saída:", error);
      toast({ title: "Erro", description: "Falha ao registrar saída", variant: "destructive" });
    }
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
      dados: entradas.map((e) => [e.dataHora, e.monitor, `#${e.veiculo}`, e.kmEntrada.toLocaleString(), e.motorista, e.cliente, e.motivo]),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Painel de Localização de Veículos */}
      <DashboardLocalizacaoVeiculos />
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

      <ImportarCSVDialog open={importOpen} onOpenChange={setImportOpen} titulo="Portaria" colunasEsperadas={["data_hora", "monitor", "veiculo", "km", "motorista", "cliente", "motivo"]} onImportar={(rows) => {
        const imported: EntradaRecord[] = rows.map((r, i) => ({
          id: Date.now() + i,
          dataHora: r.data_hora || "",
          monitor: r.monitor || "",
          veiculo: r.veiculo || "",
          kmEntrada: parseInt(r.km) || 0,
          kmInicioRota: 0, kmFimRota: 0,
          motorista: r.motorista || "",
          cliente: r.cliente || "",
          localSaida: "",
          motivo: r.motivo || "",
          programado: true,
        }));
        setEntradas((prev) => [...imported, ...prev]);
        toast({ title: `${imported.length} registros importados`, description: "Entradas adicionadas com sucesso." });
      }} />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Controle de Portaria</h1>
          <p className="page-description">Gestão de entrada e saída de veículos da frota</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Importar</Button>
          <Button variant="outline" onClick={handleRelatorio}><FileText className="mr-2 h-4 w-4" />Relatório</Button>
          <Button variant="outline" onClick={() => setEmailModalOpen(true)}><Mail className="mr-2 h-4 w-4" />Enviar por E-mail</Button>
      {/* Modal de Envio por E-mail */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Relatório por E-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Destinatários */}
            <div>
              <label className="font-semibold text-sm mb-1 block">Destinatários</label>
              <div className="flex gap-2 mb-2">
                <Input placeholder="Buscar nome ou e-mail..." value={emailBusca} onChange={e => setEmailBusca(e.target.value)} className="w-40" />
                <Button variant="outline" size="sm" onClick={() => {
                  if (emailBusca && !emailDestinatarios.includes(emailBusca)) {
                    setEmailDestinatarios([...emailDestinatarios, emailBusca]);
                    setEmailBusca("");
                  }
                }}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {emailDestinatarios.map((d, i) => (
                  <Badge key={d} className="bg-blue-100 text-blue-800 flex items-center gap-1">{d}<X className="h-3 w-3 cursor-pointer" onClick={() => setEmailDestinatarios(emailDestinatarios.filter((x, idx) => idx !== i))} /></Badge>
                ))}
              </div>
            </div>
            {/* Assunto */}
            <div>
              <label className="font-semibold text-sm mb-1 block">Assunto</label>
              <Input value={emailAssunto} onChange={e => setEmailAssunto(e.target.value)} />
            </div>
            {/* Mensagem adicional */}
            <div>
              <label className="font-semibold text-sm mb-1 block">Mensagem adicional</label>
              <Textarea placeholder="Mensagem opcional..." value={emailMensagem} onChange={e => setEmailMensagem(e.target.value)} />
            </div>
            {/* Preview */}
            <div className="bg-muted rounded p-2 text-sm">
              <div className="font-semibold mb-1">Preview do E-mail:</div>
              <div>Período: {filtrosEntradas.dataDe ? filtrosEntradas.dataDe.toLocaleDateString("pt-BR") : "-"} até {filtrosEntradas.dataAte ? filtrosEntradas.dataAte.toLocaleDateString("pt-BR") : "-"}</div>
              <div>Resumo:</div>
              <ul className="ml-4 list-disc">
                <li>Total de veículos: {filteredEntradas.length}</li>
                <li>Entradas hoje: {stats.entradasHoje}</li>
                <li>Saídas hoje: {stats.saidasHoje}</li>
                <li>Em operação: {stats.emOperacao}</li>
                <li>Na garagem: {stats.naGaragem}</li>
              </ul>
              {emailMensagem && <div className="mt-2">Mensagem adicional: <span className="italic">{emailMensagem}</span></div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>Cancelar</Button>
            <Button disabled={emailEnviando || emailDestinatarios.length === 0} onClick={async () => {
              setEmailEnviando(true);
              // Simulação de envio
              setTimeout(() => {
                setEmailEnviando(false);
                setEmailModalOpen(false);
                toast({ title: "E-mail enviado!", description: "Relatório enviado com sucesso.", variant: "default" });
                setEmailDestinatarios([]);
                setEmailAssunto(`Relatório de Portaria — ${new Date().toLocaleDateString("pt-BR")}`);
                setEmailMensagem("");
              }, 1200);
            }}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <div className="space-y-2"><Label>Data/Hora</Label><Input type="datetime-local" value={formEntrada.dataHora} onChange={(e) => setFormEntrada(f => ({...f, dataHora: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Monitor</Label><Select value={formEntrada.monitor} onValueChange={(v) => setFormEntrada(f => ({...f, monitor: v}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{monitores.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Veículo *</Label><Input placeholder="Ex: 121904" value={formEntrada.veiculo} onChange={(e) => setFormEntrada(f => ({...f, veiculo: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>KM Entrada *</Label><Input type="number" placeholder="Ex: 196853" value={formEntrada.kmEntrada} onChange={(e) => setFormEntrada(f => ({...f, kmEntrada: e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>KM Início da Rota</Label><Input type="number" placeholder="Onde pegou passageiros" value={formEntrada.kmInicioRota} onChange={(e) => setFormEntrada(f => ({...f, kmInicioRota: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>KM Fim da Rota</Label><Input type="number" placeholder="Onde deixou passageiros" value={formEntrada.kmFimRota} onChange={(e) => setFormEntrada(f => ({...f, kmFimRota: e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Motorista</Label><Input placeholder="Nome do motorista" value={formEntrada.motorista} onChange={(e) => setFormEntrada(f => ({...f, motorista: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Cliente</Label><Input placeholder="Ex: JEEP" value={formEntrada.cliente} onChange={(e) => setFormEntrada(f => ({...f, cliente: e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Local de Saída</Label><Input placeholder="Última localização" value={formEntrada.localSaida} onChange={(e) => setFormEntrada(f => ({...f, localSaida: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Motivo da Entrada</Label><Select value={formEntrada.motivo} onValueChange={(v) => setFormEntrada(f => ({...f, motivo: v}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{motivosEntrada.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>Descrições Adicionais</Label><Textarea placeholder="Observações..." value={formEntrada.descricao} onChange={(e) => setFormEntrada(f => ({...f, descricao: e.target.value}))} /></div>
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
                  <div className="space-y-2"><Label>Data/Hora</Label><Input type="datetime-local" value={formSaida.dataHora} onChange={(e) => setFormSaida(f => ({...f, dataHora: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Monitor</Label><Select value={formSaida.monitor} onValueChange={(v) => setFormSaida(f => ({...f, monitor: v}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{monitores.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Veículo *</Label><Input placeholder="Ex: 121904" value={formSaida.veiculo} onChange={(e) => setFormSaida(f => ({...f, veiculo: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>KM Saída *</Label><Input type="number" placeholder="Ex: 196860" value={formSaida.kmSaida} onChange={(e) => setFormSaida(f => ({...f, kmSaida: e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Motorista</Label><Input placeholder="Nome do motorista" value={formSaida.motorista} onChange={(e) => setFormSaida(f => ({...f, motorista: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Destino/Cliente</Label><Input placeholder="Ex: TECON" value={formSaida.destino} onChange={(e) => setFormSaida(f => ({...f, destino: e.target.value}))} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Vistoria Conforme?</Label>
                  <Select value={formSaida.vistoriaConforme} onValueChange={(v) => setFormSaida(f => ({...f, vistoriaConforme: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sim">Sim - Conforme</SelectItem><SelectItem value="nao">Não - Com problemas</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2"><Label>Observações</Label><Textarea placeholder="Observações adicionais..." value={formSaida.observacoes} onChange={(e) => setFormSaida(f => ({...f, observacoes: e.target.value}))} /></div>
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
          <FiltroEntradasCompacto
            filtros={filtrosEntradas}
            setFiltros={setFiltrosEntradas}
            opcoesStatus={opcoesStatus}
            opcoesClientes={opcoesClientes}
            opcoesMonitores={opcoesMonitores}
            totalResultados={filteredEntradas.length}
            onLimpar={limparFiltrosEntradas}
          />
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
          <FiltroSaidasCompacto
            filtros={filtrosSaidas}
            setFiltros={setFiltrosSaidas}
            opcoesStatus={opcoesStatus}
            opcoesClientes={opcoesClientes}
            opcoesMonitores={opcoesMonitores}
            totalResultados={filteredSaidas.length}
            onLimpar={limparFiltrosSaidas}
          />
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
