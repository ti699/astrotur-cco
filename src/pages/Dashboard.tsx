import { useState, useMemo } from "react";
import { Bus, AlertTriangle, Wrench, Fuel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

const allOccurrences = [
  { id: 1, date: "2026-02-10", time: "14:30", type: "QUEBRA", vehicle: "121904", client: "JEEP", status: "em_andamento", description: "Problema no sistema de freio" },
  { id: 2, date: "2026-02-10", time: "13:15", type: "SOCORRO", vehicle: "102104", client: "HDH", status: "concluido", description: "Pneu furado - substituido" },
  { id: 3, date: "2026-02-09", time: "11:45", type: "ATRASO", vehicle: "101318", client: "VILA GALE", status: "concluido", description: "Atraso de 15 minutos" },
  { id: 4, date: "2026-02-09", time: "09:20", type: "INFORMACAO", vehicle: "2408", client: "CBA", status: "concluido", description: "Programacao alterada" },
  { id: 5, date: "2026-02-08", time: "07:00", type: "SOCORRO", vehicle: "2536", client: "MONTE RODOVIAS", status: "pendente", description: "Motor falhando" },
];

const weeklyData = [
  { day: "Seg", ocorrencias: 12, atrasos: 3 },
  { day: "Ter", ocorrencias: 8, atrasos: 2 },
  { day: "Qua", ocorrencias: 15, atrasos: 5 },
  { day: "Qui", ocorrencias: 10, atrasos: 1 },
  { day: "Sex", ocorrencias: 6, atrasos: 2 },
  { day: "Sab", ocorrencias: 4, atrasos: 0 },
  { day: "Dom", ocorrencias: 3, atrasos: 1 },
];

const fleetStatus = [
  { status: "Em operacao", count: 38, cls: "bg-green-500" },
  { status: "Na garagem", count: 8, cls: "bg-blue-500" },
  { status: "Em manutencao", count: 5, cls: "bg-amber-500" },
  { status: "Em abastecimento", count: 3, cls: "bg-purple-500" },
  { status: "Em socorro", count: 4, cls: "bg-red-500" },
];

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  em_andamento: { cls: "bg-amber-100 text-amber-800", label: "Em Andamento" },
  concluido: { cls: "bg-green-100 text-green-800", label: "Concluido" },
  pendente: { cls: "bg-red-100 text-red-800", label: "Pendente" },
};

const TYPE_COLORS: Record<string, string> = {
  QUEBRA: "bg-red-500",
  SOCORRO: "bg-orange-500",
  ATRASO: "bg-amber-500",
  INFORMACAO: "bg-primary",
};

export default function Dashboard() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const filtered = useMemo(() => allOccurrences.filter((o) => {
    if (dataInicio && o.date < dataInicio) return false;
    if (dataFim && o.date > dataFim) return false;
    return true;
  }), [dataInicio, dataFim]);

  const kpiData = [
    { title: "Frota Total", value: "58", icon: Bus, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Ocorrencias", value: filtered.length.toString(), icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-100" },
    { title: "Em Manutencao", value: "5", icon: Wrench, color: "text-amber-600", bgColor: "bg-amber-100" },
    { title: "Em Abastecimento", value: "3", icon: Fuel, color: "text-purple-600", bgColor: "bg-purple-100" },
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
                  <p className="text-2xl sm:text-3xl font-bold">{kpi.value}</p>
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
          <div className="space-y-3">
            {filtered.map((o) => {
              const st = STATUS_MAP[o.status] || { cls: "", label: o.status };
              const typeColor = TYPE_COLORS[o.type] || "bg-gray-500";
              return (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="text-sm font-mono text-muted-foreground w-14 flex-shrink-0">{o.time}</span>
                  <Badge className={`${typeColor} text-white w-fit`}>{o.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{o.vehicle}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-muted-foreground truncate">{o.client}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{o.description}</p>
                  </div>
                  <Badge className={`${st.cls} w-fit flex-shrink-0`}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}