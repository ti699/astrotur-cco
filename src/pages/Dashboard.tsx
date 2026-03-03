import { useState, useMemo } from "react";
import { Bus, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useDashboard, useOcorrencias, useVeiculos } from "@/services/useApi";

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  em_andamento: { cls: "bg-amber-100 text-amber-800", label: "Em Andamento" },
  EM_ANDAMENTO: { cls: "bg-amber-100 text-amber-800", label: "Em Andamento" },
  concluido: { cls: "bg-green-100 text-green-800", label: "Concluido" },
  CONCLUIDO: { cls: "bg-green-100 text-green-800", label: "Concluido" },
  pendente: { cls: "bg-red-100 text-red-800", label: "Pendente" },
  PENDENTE: { cls: "bg-red-100 text-red-800", label: "Pendente" },
};

const TYPE_COLORS: Record<string, string> = {
  QUEBRA: "bg-red-500",
  Quebra: "bg-red-500",
  SOCORRO: "bg-orange-500",
  Socorro: "bg-orange-500",
  ATRASO: "bg-amber-500",
  Atraso: "bg-amber-500",
  INFORMACAO: "bg-primary",
  "Informação": "bg-primary",
};

export default function Dashboard() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const { data: dashboardData, isLoading: loadingDash } = useDashboard();
  const { data: ocorrencias = [], isLoading: loadingOc } = useOcorrencias();
  const { data: veiculos = [] } = useVeiculos();

  const stats = dashboardData?.stats;

  // ── Gráfico semanal a partir dos dados reais ─────────────────────────────
  const weeklyData = useMemo(() => {
    const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    // Últimos 7 dias (sem incluir hoje no futuro)
    const hoje = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayOcs = ocorrencias.filter((o) => {
        const oc = (o.data_ocorrencia || o.data_quebra || "").split("T")[0];
        return oc === dateStr;
      });
      return {
        day: DAYS[d.getDay()],
        ocorrencias: dayOcs.length,
        atrasos: dayOcs.filter((o) => o.houve_atraso === "sim").length,
      };
    });
  }, [ocorrencias]);

  // ── Status da frota a partir dos dados reais ─────────────────────────────
  const fleetStatus = useMemo(() => {
    const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
      EM_OPERACAO: { label: "Em operação", cls: "bg-green-500" },
      NA_GARAGEM:  { label: "Na garagem",  cls: "bg-blue-500" },
      EM_MANUTENCAO: { label: "Em manutenção", cls: "bg-amber-500" },
      EM_ABASTECIMENTO: { label: "Em abastecimento", cls: "bg-purple-500" },
      EM_SOCORRO: { label: "Em socorro",  cls: "bg-red-500" },
    };
    const counts: Record<string, number> = {};
    for (const v of veiculos) {
      const s = (v.status || "NA_GARAGEM").toUpperCase();
      counts[s] = (counts[s] || 0) + 1;
    }
    // Montar na ordem desejada, incluindo categorias sem veículos (0)
    return Object.entries(STATUS_LABELS).map(([key, meta]) => ({
      status: meta.label,
      count: counts[key] || 0,
      cls: meta.cls,
    }));
  }, [veiculos]);

  // Filtra e limita as ocorrências recentes
  const filtered = useMemo(() => {
    return ocorrencias
      .filter((o) => {
        const dateStr = (o.data_ocorrencia || o.data_quebra || "").split("T")[0];
        if (dataInicio && dateStr < dataInicio) return false;
        if (dataFim && dateStr > dataFim) return false;
        return true;
      })
      .slice(0, 8);
  }, [ocorrencias, dataInicio, dataFim]);

  const kpiData = [
    { title: "Frota Total", value: loadingDash ? "—" : String(stats?.veiculosAtribuidos ?? "—"), icon: Bus, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Ocorrencias (30d)", value: loadingDash ? "—" : String(stats?.totalOcorrencias ?? "—"), icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-100" },
    { title: "Atrasos", value: loadingDash ? "—" : String(stats?.atrasos ?? "—"), icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100" },
    { title: "Tempo Medio Atend.", value: loadingDash ? "—" : (stats?.tempoMedioAtendimento ?? "—"), icon: Clock, color: "text-purple-600", bgColor: "bg-purple-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Operacional</h1>
          <p className="text-muted-foreground">Visao geral das operacoes em tempo real</p>
        </div>
        <div className="flex gap-2">
          <Link to="/portaria"><Button variant="outline" size="sm">Portaria</Button></Link>
          <Link to="/ocorrencias/nova"><Button size="sm"><AlertTriangle className="mr-2 h-4 w-4" />Nova Ocorrencia</Button></Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Data Inicio</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(""); setDataFim(""); }}>Limpar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold">
                {loadingDash ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : kpi.value}
              </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{kpi.title}</p>
                </div>
                <div className={`rounded-lg p-2 ${kpi.bgColor}`}>
                  <kpi.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Ocorrencias da Semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorOc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152, 60%, 32%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(152, 60%, 32%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Area type="monotone" dataKey="ocorrencias" stroke="hsl(152, 60%, 32%)" fillOpacity={1} fill="url(#colorOc)" name="Ocorrencias" />
                <Area type="monotone" dataKey="atrasos" stroke="hsl(0, 84%, 60%)" fillOpacity={1} fill="url(#colorAt)" name="Atrasos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Status da Frota</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fleetStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 ${item.cls}`} />
                  <p className="flex-1 text-sm font-medium">{item.status}</p>
                  <p className="text-xl font-bold">{item.count}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold">{fleetStatus.reduce((s, i) => s + i.count, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Disponibilidade</span>
                <span className="text-lg font-bold text-green-600">79%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ocorrencias Recentes</CardTitle>
          <Link to="/ocorrencias"><Button variant="ghost" size="sm">Ver todas</Button></Link>
        </CardHeader>
        <CardContent>
          {loadingOc ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma ocorrencia no periodo.</p>
          ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const statusKey = o.status || "";
              const st = STATUS_MAP[statusKey] || { cls: "bg-gray-100 text-gray-800", label: statusKey };
              const tipo = o.tipo_ocorrencia || o.tipo_quebra_nome || "";
              const typeColor = TYPE_COLORS[tipo] || "bg-gray-500";
              const numero = o.numero_ocorrencia || o.numero || String(o.id);
              const hora = (o.data_ocorrencia || o.data_quebra || "").slice(11, 16) || "—";
              return (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="text-sm font-mono text-muted-foreground w-14 flex-shrink-0">{hora}</span>
                  <Badge className={`${typeColor} text-white w-fit`}>{tipo || "—"}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{numero}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground truncate">{o.cliente_nome || "—"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{o.descricao}</p>
                  </div>
                  <Badge className={`${st.cls} w-fit flex-shrink-0`}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}