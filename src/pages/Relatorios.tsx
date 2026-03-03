import { useState, useMemo } from "react";
import {
  Download, FileSpreadsheet, FileText, BarChart3, TrendingUp, X, ArrowUp, ArrowDown,
  AlertTriangle, Truck, Users, Wrench, Fuel, Building2, Shield, DoorOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPie, Pie, Cell, LineChart, Line } from "recharts";
import { gerarRelatorioPDF } from "@/utils/gerarRelatorioPDF";
import { useToast } from "@/hooks/use-toast";

// ── Definição dos módulos e widgets ──

interface WidgetDef {
  id: string;
  modulo: string;
  titulo: string;
  tipo: "numero" | "grafico-pizza" | "grafico-barras" | "grafico-linha" | "tabela";
}

const MODULOS = [
  { id: "ocorrencias", label: "Ocorrências", icon: AlertTriangle },
  { id: "avarias", label: "Avarias", icon: Shield },
  { id: "portaria", label: "Portaria", icon: DoorOpen },
  { id: "veiculos", label: "Veículos", icon: Truck },
  { id: "motoristas", label: "Motoristas", icon: Users },
  { id: "manutencao", label: "Manutenção", icon: Wrench },
  { id: "abastecimento", label: "Abastecimento", icon: Fuel },
  { id: "clientes", label: "Clientes", icon: Building2 },
];

const WIDGETS: WidgetDef[] = [
  // Ocorrências
  { id: "oc_total", modulo: "ocorrencias", titulo: "Total de Ocorrências", tipo: "numero" },
  { id: "oc_tipo", modulo: "ocorrencias", titulo: "Ocorrências por Tipo", tipo: "grafico-pizza" },
  { id: "oc_cliente", modulo: "ocorrencias", titulo: "Ocorrências por Cliente", tipo: "grafico-barras" },
  { id: "oc_evolucao", modulo: "ocorrencias", titulo: "Evolução Mensal", tipo: "grafico-linha" },
  { id: "oc_tabela", modulo: "ocorrencias", titulo: "Tabela de Ocorrências", tipo: "tabela" },
  // Avarias
  { id: "av_total", modulo: "avarias", titulo: "Total de Avarias", tipo: "numero" },
  { id: "av_status", modulo: "avarias", titulo: "Avarias por Status", tipo: "grafico-pizza" },
  { id: "av_tabela", modulo: "avarias", titulo: "Tabela de Avarias", tipo: "tabela" },
  // Portaria
  { id: "pt_entradas", modulo: "portaria", titulo: "Entradas/Saídas Hoje", tipo: "numero" },
  { id: "pt_km", modulo: "portaria", titulo: "KM Morto Total", tipo: "numero" },
  { id: "pt_tabela", modulo: "portaria", titulo: "Tabela de Portaria", tipo: "tabela" },
  // Veículos
  { id: "ve_status", modulo: "veiculos", titulo: "Veículos por Status", tipo: "grafico-pizza" },
  { id: "ve_tabela", modulo: "veiculos", titulo: "Tabela de Veículos", tipo: "tabela" },
  // Motoristas
  { id: "mo_total", modulo: "motoristas", titulo: "Total Ativos", tipo: "numero" },
  { id: "mo_cnh", modulo: "motoristas", titulo: "CNH Vencendo", tipo: "numero" },
  { id: "mo_tabela", modulo: "motoristas", titulo: "Tabela de Motoristas", tipo: "tabela" },
  // Manutenção
  { id: "ma_status", modulo: "manutencao", titulo: "Abertas vs Concluídas", tipo: "grafico-barras" },
  { id: "ma_tabela", modulo: "manutencao", titulo: "Tabela de Manutenção", tipo: "tabela" },
  // Abastecimento
  { id: "ab_litros", modulo: "abastecimento", titulo: "Total Litros", tipo: "numero" },
  { id: "ab_custo", modulo: "abastecimento", titulo: "Custo Total", tipo: "numero" },
  { id: "ab_tabela", modulo: "abastecimento", titulo: "Tabela de Abastecimento", tipo: "tabela" },
  // Clientes
  { id: "cl_total", modulo: "clientes", titulo: "Total de Clientes", tipo: "numero" },
  { id: "cl_sla", modulo: "clientes", titulo: "Clientes por SLA", tipo: "grafico-pizza" },
  { id: "cl_tabela", modulo: "clientes", titulo: "Tabela de Clientes", tipo: "tabela" },
];

// ── Mock data para todos os módulos ──

const MOCK_DATA: Record<string, any> = {
  oc_total: { valor: 185, label: "Total Ocorrências" },
  oc_tipo: [
    { name: "Socorro", value: 65, color: "#f97316" }, { name: "Quebra", value: 45, color: "#ef4444" },
    { name: "Atraso", value: 35, color: "#eab308" }, { name: "Informação", value: 28, color: "#3b82f6" },
  ],
  oc_cliente: [
    { cliente: "JEEP", total: 45 }, { cliente: "VILA GALÉ", total: 32 }, { cliente: "HDH", total: 28 },
    { cliente: "CBA", total: 22 }, { cliente: "MONTE RODOVIAS", total: 18 },
  ],
  oc_evolucao: [
    { mes: "Jan", ocorrencias: 120, atrasos: 15 }, { mes: "Fev", ocorrencias: 135, atrasos: 18 },
    { mes: "Mar", ocorrencias: 128, atrasos: 12 }, { mes: "Abr", ocorrencias: 142, atrasos: 20 },
    { mes: "Mai", ocorrencias: 138, atrasos: 16 }, { mes: "Jun", ocorrencias: 155, atrasos: 22 },
  ],
  oc_tabela: {
    colunas: ["Data", "Cliente", "Tipo", "Veículo", "Status"],
    linhas: [
      ["25/01/2025", "JEEP", "SOCORRO", "#101256", "CONCLUIDO"],
      ["25/01/2025", "VILA GALÉ", "QUEBRA", "#101318", "CONCLUIDO"],
      ["24/01/2025", "HDH", "ATRASO", "#304", "CONCLUIDO"],
    ],
  },
  av_total: { valor: 42, label: "Total Avarias" },
  av_status: [
    { name: "Pendente", value: 12, color: "#eab308" }, { name: "Cobrada", value: 18, color: "#ef4444" },
    { name: "Abonada", value: 12, color: "#22c55e" },
  ],
  av_tabela: {
    colunas: ["Data", "Veículo", "Motorista", "Tipo", "Valor"],
    linhas: [
      ["20/01/2025", "#101256", "João Silva", "Riscos", "R$ 800"],
      ["18/01/2025", "#101318", "Carlos Souza", "Vidro quebrado", "R$ 1.200"],
    ],
  },
  pt_entradas: { valor: 28, label: "Entradas/Saídas Hoje" },
  pt_km: { valor: 342, label: "KM Morto Total (mês)" },
  pt_tabela: {
    colunas: ["Data", "Veículo", "Motorista", "Tipo", "KM Morto"],
    linhas: [
      ["25/01/2025", "#101256", "João Silva", "Saída", "65 km"],
      ["25/01/2025", "#304", "Carlos Lima", "Entrada", "12 km"],
    ],
  },
  ve_status: [
    { name: "Em operação", value: 35, color: "#22c55e" }, { name: "Garagem", value: 12, color: "#3b82f6" },
    { name: "Manutenção", value: 5, color: "#ef4444" },
  ],
  ve_tabela: {
    colunas: ["Prefixo", "Placa", "Status", "KM Atual"],
    linhas: [
      ["101256", "ABC-1234", "EM OPERAÇÃO", "125.430"],
      ["101318", "DEF-5678", "GARAGEM", "98.200"],
    ],
  },
  mo_total: { valor: 48, label: "Motoristas Ativos" },
  mo_cnh: { valor: 5, label: "CNH Vencendo (30 dias)" },
  mo_tabela: {
    colunas: ["Nome", "CNH", "Validade", "Status"],
    linhas: [
      ["João Silva", "123456789", "15/06/2025", "ATIVO"],
      ["Carlos Souza", "987654321", "20/02/2025", "CNH VENCENDO"],
    ],
  },
  ma_status: [
    { tipo: "Abertas", total: 8 }, { tipo: "Concluídas", total: 22 },
  ],
  ma_tabela: {
    colunas: ["Veículo", "Tipo", "Status", "Data"],
    linhas: [
      ["#101256", "Preventiva", "CONCLUÍDA", "20/01/2025"],
      ["#304", "Corretiva", "ABERTA", "24/01/2025"],
    ],
  },
  ab_litros: { valor: 12450, label: "Total Litros (mês)" },
  ab_custo: { valor: "R$ 74.700", label: "Custo Total (mês)" },
  ab_tabela: {
    colunas: ["Data", "Veículo", "Litros", "Valor"],
    linhas: [
      ["25/01/2025", "#101256", "120L", "R$ 720"],
      ["24/01/2025", "#304", "85L", "R$ 510"],
    ],
  },
  cl_total: { valor: 4, label: "Total Clientes" },
  cl_sla: [
    { name: "Alto", value: 2, color: "#ef4444" }, { name: "Médio", value: 2, color: "#eab308" },
  ],
  cl_tabela: {
    colunas: ["Empresa", "Responsável", "SLA", "Multa"],
    linhas: [
      ["JEEP", "Carlos Silva", "ALTO (2h)", "R$ 5.000"],
      ["VILA GALÉ", "Maria Santos", "ALTO (3h)", "R$ 3.000"],
    ],
  },
};

// ── Componente de renderização de widget ──

function RenderWidget({ widget, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  widget: WidgetDef; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const data = MOCK_DATA[widget.id];
  const moduloInfo = MODULOS.find((m) => m.id === widget.modulo);

  const renderContent = () => {
    switch (widget.tipo) {
      case "numero":
        return (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{typeof data?.valor === "number" ? data.valor.toLocaleString() : data?.valor}</p>
              <p className="text-sm text-muted-foreground">{data?.label}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary/30" />
          </div>
        );
      case "grafico-pizza":
        return (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={90} dataKey="value">
                  {data?.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        );
      case "grafico-barras":
        return (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout={data?.[0]?.cliente ? "vertical" : "horizontal"}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                {data?.[0]?.cliente ? (
                  <><XAxis type="number" /><YAxis type="category" dataKey="cliente" width={100} /><Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></>
                ) : (
                  <><XAxis dataKey="tipo" /><YAxis /><Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></>
                )}
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case "grafico-linha":
        return (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" /><YAxis />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="ocorrencias" stroke="hsl(var(--primary))" strokeWidth={2} name="Ocorrências" />
                <Line type="monotone" dataKey="atrasos" stroke="hsl(var(--destructive))" strokeWidth={2} name="Atrasos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      case "tabela":
        return (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="data-table-header">
                  {data?.colunas?.map((col: string) => <TableHead key={col}>{col}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.linhas?.map((row: string[], i: number) => (
                  <TableRow key={i} className="data-table-row">
                    {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={widget.tipo === "numero" ? "" : "lg:col-span-2"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{moduloInfo?.label}</Badge>
            <CardTitle className="text-base">{widget.titulo}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {!isFirst && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp}><ArrowUp className="h-3 w-3" /></Button>}
            {!isLast && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown}><ArrowDown className="h-3 w-3" /></Button>}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}

// ── Página principal ──

export default function Relatorios() {
  const { toast } = useToast();
  const [modulosSelecionados, setModulosSelecionados] = useState<string[]>([]);
  const [widgetsSelecionados, setWidgetsSelecionados] = useState<string[]>([]);

  const widgetsDisponiveis = useMemo(
    () => WIDGETS.filter((w) => modulosSelecionados.includes(w.modulo)),
    [modulosSelecionados]
  );

  const widgetsAtivos = useMemo(
    () => widgetsSelecionados.map((id) => WIDGETS.find((w) => w.id === id)!).filter(Boolean),
    [widgetsSelecionados]
  );

  const toggleModulo = (id: string) => {
    setModulosSelecionados((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      // Remove widgets de módulos desmarcados
      const removidos = WIDGETS.filter((w) => w.modulo === id).map((w) => w.id);
      if (!next.includes(id)) {
        setWidgetsSelecionados((ws) => ws.filter((w) => !removidos.includes(w)));
      }
      return next;
    });
  };

  const toggleWidget = (id: string) => {
    setWidgetsSelecionados((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  const removeWidget = (id: string) => setWidgetsSelecionados((prev) => prev.filter((w) => w !== id));

  const moveWidget = (index: number, direction: -1 | 1) => {
    setWidgetsSelecionados((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleExportPDF = async () => {
    await gerarRelatorioPDF({
      titulo: "Dashboard Personalizado",
      resumo: widgetsAtivos.filter((w) => w.tipo === "numero").map((w) => ({
        label: w.titulo,
        valor: String(MOCK_DATA[w.id]?.valor ?? "—"),
      })),
      colunas: ["Widget", "Tipo", "Módulo"],
      dados: widgetsAtivos.map((w) => [w.titulo, w.tipo, MODULOS.find((m) => m.id === w.modulo)?.label || ""]),
      geradoPor: "SISTEMA CCO",
    });
  };

  const handleExportCSV = () => {
    const tabelaWidgets = widgetsAtivos.filter((w) => w.tipo === "tabela");
    if (tabelaWidgets.length === 0) {
      toast({ title: "Nenhuma tabela selecionada", description: "Adicione pelo menos um widget de tabela para exportar CSV." });
      return;
    }
    let csv = "\uFEFF";
    tabelaWidgets.forEach((w) => {
      const data = MOCK_DATA[w.id];
      csv += `${w.titulo}\n`;
      csv += data.colunas.join(";") + "\n";
      data.linhas.forEach((row: string[]) => { csv += row.join(";") + "\n"; });
      csv += "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dashboard_personalizado.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado", description: "O arquivo foi gerado com sucesso." });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-description">Monte seu dashboard personalizado selecionando módulos e informações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={widgetsSelecionados.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={widgetsSelecionados.length === 0}>
            <FileText className="mr-2 h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      {/* Seletor de Módulos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" />1. Selecione os Módulos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MODULOS.map((m) => {
              const Icon = m.icon;
              const isActive = modulosSelecionados.includes(m.id);
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <Checkbox checked={isActive} onCheckedChange={() => toggleModulo(m.id)} />
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Widgets */}
      {modulosSelecionados.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" />2. Escolha as Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modulosSelecionados.map((modId) => {
                const modulo = MODULOS.find((m) => m.id === modId)!;
                const widgets = widgetsDisponiveis.filter((w) => w.modulo === modId);
                return (
                  <div key={modId}>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">{modulo.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {widgets.map((w) => {
                        const isActive = widgetsSelecionados.includes(w.id);
                        return (
                          <label
                            key={w.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all ${
                              isActive ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            <Checkbox checked={isActive} onCheckedChange={() => toggleWidget(w.id)} />
                            {w.titulo}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Renderizado */}
      {widgetsAtivos.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Seu Dashboard ({widgetsAtivos.length} widgets)</h2>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setWidgetsSelecionados([])}>Limpar tudo</Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {widgetsAtivos.map((w, i) => (
              <RenderWidget
                key={w.id}
                widget={w}
                onRemove={() => removeWidget(w.id)}
                onMoveUp={() => moveWidget(i, -1)}
                onMoveDown={() => moveWidget(i, 1)}
                isFirst={i === 0}
                isLast={i === widgetsAtivos.length - 1}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">Nenhum widget selecionado</h3>
            <p className="text-sm text-muted-foreground mt-1">Selecione módulos e informações acima para montar seu dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
