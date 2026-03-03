import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { TIPOS_SOCORRO, type TipoSocorroNome } from "@/types";
import { useCreateOcorrencia, useClientes, useVeiculos } from "@/services/useApi";

const tiposOcorrencia = [
  "Atraso",
  "Comunicação ao cliente",
  "Falta de motorista",
  "Informação",
  "N/A",
  "Quebra",
  "Retido",
  "Serviço",
  "Socorro",
];

const plantonistas = ["VALDOMIRO", "MACARIO", "IRANILDO", "ANDERSON"];

export default function NovaOcorrencia() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { registrarLog } = useAuditLog();
  const createOcorrencia = useCreateOcorrencia();
  const { data: clientesData = [] } = useClientes();
  const { data: veiculosData = [] } = useVeiculos();

  const [houveAtraso, setHouveAtraso] = useState(false);
  const [tipoOcorrencia, setTipoOcorrencia] = useState("");
  const [tipoSocorro, setTipoSocorro] = useState<TipoSocorroNome | "">("");
  const [descricaoSocorro, setDescricaoSocorro] = useState("");

  // Campos controlados do form
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    hora: new Date().toTimeString().slice(0, 5),
    plantonista: "",
    cliente: "",
    veiculo_previsto: "",
    veiculo_substituto: "",
    horario_socorro: "",
    horario_saida: "",
    tempo_atraso: "",
    status: "PENDENTE",
    descricao: "",
  });

  const setField = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // Verificar se tipo de socorro selecionado requer descrição
  const tipoSocorroConfig = TIPOS_SOCORRO.find(t => t.nome === tipoSocorro);
  const requerDescricao = tipoSocorroConfig?.requerDescricao || false;
  const alertaDiretoria = tipoSocorroConfig?.alertaDiretoria || false;
  const isAvaria = tipoSocorro === "Avaria";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar descrição obrigatória para "Outros"
    if (requerDescricao && !descricaoSocorro.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Para o tipo 'Outros', a descrição é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    // Alerta para Pane Seca
    if (alertaDiretoria) {
      toast({
        title: "⚠️ ALERTA CRÍTICO - Pane Seca",
        description: "A diretoria será notificada automaticamente sobre esta ocorrência.",
        variant: "destructive",
      });
      registrarLog("ocorrencia", `oc_${Date.now()}`, "ALERTA_PANE_SECA", undefined, undefined, {
        tipoSocorro,
        alertaEnviado: true,
      });
    }

    registrarLog("ocorrencia", `oc_${Date.now()}`, "OCORRENCIA_CRIADA", undefined, "PENDENTE", {
      tipoOcorrencia,
      tipoSocorro,
    });

    // Enviar para o backend
    const payload = {
      monitor_nome: formData.plantonista,
      cliente_nome: formData.cliente,
      data_ocorrencia: formData.data,
      tipo_ocorrencia: tipoSocorro || tipoOcorrencia,
      veiculo_placa: formData.veiculo_previsto,
      houve_troca_veiculo: formData.veiculo_substituto ? "sim" : "nao",
      veiculo_substituto_placa: formData.veiculo_substituto || null,
      horario_socorro: formData.horario_socorro || null,
      horario_saida: formData.horario_saida || null,
      houve_atraso: houveAtraso ? "sim" : "nao",
      tempo_atraso: houveAtraso ? formData.tempo_atraso : null,
      descricao: formData.descricao || descricaoSocorro,
      status: formData.status,
    };

    createOcorrencia.mutate(payload, {
      onSuccess: () => {
        toast({
          title: "Ocorrência registrada!",
          description: isAvaria
            ? "Ocorrência salva. Sugestão: Abra um workflow de DAI para esta avaria."
            : "A ocorrência foi salva com sucesso.",
        });
        navigate("/ocorrencias");
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="page-title">Nova Ocorrência</h1>
          <p className="page-description">Registre uma nova ocorrência do CCO</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da Ocorrência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setField("data", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">Hora *</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setField("hora", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plantonista">Plantonista *</Label>
                <Select value={formData.plantonista} onValueChange={(v) => setField("plantonista", v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plantonista" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantonistas.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente/Contrato *</Label>
                <Select value={formData.cliente} onValueChange={(v) => setField("cliente", v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesData.length > 0
                      ? clientesData.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>
                            {c.nome}
                          </SelectItem>
                        ))
                      : ["JEEP","HDH","CBA","VILA GALÉ","MONTE RODOVIAS"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Ocorrência *</Label>
                <Select 
                  required 
                  value={tipoOcorrencia}
                  onValueChange={setTipoOcorrencia}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposOcorrencia.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Veículos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Veículos Envolvidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="veiculoPrevisto">Veículo Previsto *</Label>
                <Input
                  id="veiculoPrevisto"
                  placeholder="Ex: 121904"
                  value={formData.veiculo_previsto}
                  onChange={(e) => setField("veiculo_previsto", e.target.value)}
                  required
                  list="veiculos-list"
                />
                <datalist id="veiculos-list">
                  {veiculosData.map((v) => <option key={v.id} value={v.placa} />)}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="veiculoSubstituido">Veículo Substituído</Label>
                <Input
                  id="veiculoSubstituido"
                  placeholder="Ex: 121928 (se houve troca)"
                  value={formData.veiculo_substituto}
                  onChange={(e) => setField("veiculo_substituto", e.target.value)}
                  list="veiculos-list"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoSocorro">Tipo de Socorro *</Label>
                <Select
                  value={tipoSocorro}
                  onValueChange={(v) => setTipoSocorro(v as TipoSocorroNome)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de socorro" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_SOCORRO.map((t) => (
                      <SelectItem key={t.id} value={t.nome}>
                        {t.nome}
                        {t.alertaDiretoria && " ⚠️"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Alerta Pane Seca */}
              {alertaDiretoria && (
                <Alert variant="destructive" className="bg-red-50 border-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Alerta Crítico - Pane Seca</AlertTitle>
                  <AlertDescription>
                    Esta é uma falha operacional evitável. A diretoria será notificada automaticamente.
                  </AlertDescription>
                </Alert>
              )}

              {/* Alerta Avaria */}
              {isAvaria && (
                <Alert className="bg-amber-50 border-amber-300">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Sugestão: Workflow de DAI</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Após salvar, considere abrir um novo workflow de DAI em Avarias para iniciar o processo de precificação.
                  </AlertDescription>
                </Alert>
              )}

              {/* Campo descrição obrigatório para "Outros" */}
              {requerDescricao && (
                <div className="space-y-2">
                  <Label htmlFor="descricaoSocorro">Descrição do Socorro *</Label>
                  <Textarea
                    id="descricaoSocorro"
                    placeholder="Descreva detalhadamente o tipo de socorro..."
                    value={descricaoSocorro}
                    onChange={(e) => setDescricaoSocorro(e.target.value)}
                    className="min-h-[80px]"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horarioSocorro">Horário do Socorro</Label>
                  <Input id="horarioSocorro" type="time" value={formData.horario_socorro} onChange={(e) => setField("horario_socorro", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horarioSaidaSocorro">Horário Saída Socorro</Label>
                  <Input id="horarioSaidaSocorro" type="time" value={formData.horario_saida} onChange={(e) => setField("horario_saida", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Atraso */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações de Atraso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="houveAtraso">Houve Atraso?</Label>
                  <p className="text-sm text-muted-foreground">
                    Marque se a ocorrência causou atraso na operação
                  </p>
                </div>
                <Switch
                  id="houveAtraso"
                  checked={houveAtraso}
                  onCheckedChange={setHouveAtraso}
                />
              </div>

              {houveAtraso && (
                <div className="space-y-2">
                  <Label htmlFor="tempoAtraso">Tempo de Atraso (HH:MM)</Label>
                  <Input
                    id="tempoAtraso"
                    type="time"
                    placeholder="Ex: 00:30"
                    value={formData.tempo_atraso}
                    onChange={(e) => setField("tempo_atraso", e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status e Descrição */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status e Descrição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada *</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva a ocorrência em detalhes..."
                  className="min-h-[120px]"
                  value={formData.descricao}
                  onChange={(e) => setField("descricao", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aprovador">Aprovador</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione se necessário" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantonistas.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createOcorrencia.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createOcorrencia.isPending ? "Salvando..." : "Salvar Ocorrência"}
          </Button>
        </div>
      </form>
    </div>
  );
}
