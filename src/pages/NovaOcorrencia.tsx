import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { TIPOS_SOCORRO, type TipoSocorroNome } from "@/types";
import {
  ocorrenciaSchema,
  TIPOS_OCORRENCIA,
  type OcorrenciaFormData,
} from "@/schemas/ocorrenciaSchema";
import { useCreateOcorrencia, useClientes, useVeiculos, useUsuarios } from "@/services/useApi";
import { useState } from "react";

const PLANTONISTAS = ["VALDOMIRO", "MACARIO", "IRANILDO", "ANDERSON"];

// ─── Componente de erro de campo ─────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export default function NovaOcorrencia() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createOcorrencia = useCreateOcorrencia();
  const { data: clientesData = [] } = useClientes();
  const { data: veiculosData = [] } = useVeiculos();
  const { data: usuariosData = [] } = useUsuarios();

  // Estado para campos da seção Socorro
  // Mock para teste
  const [codigoSocorro] = useState(() => `SOC-TESTE-1234`);
  const [turnoSocorro, setTurnoSocorro] = useState("Manhã");
  const [motoristaSocorro, setMotoristaSocorro] = useState("João Motorista");
  const [rotaSocorro, setRotaSocorro] = useState("Rota 12 - Centro");
  const [naturezaSocorro, setNaturezaSocorro] = useState("Mecânico");
  const [houveTrocaSocorro, setHouveTrocaSocorro] = useState(true);
  const [carroReservaSocorro, setCarroReservaSocorro] = useState("ABC-1234");
  const [tipoAtendimentoSocorro, setTipoAtendimentoSocorro] = useState("Reparo");
  const [fotosSocorro, setFotosSocorro] = useState([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OcorrenciaFormData>({
    resolver: zodResolver(ocorrenciaSchema),
    defaultValues: {
      data: new Date().toISOString().split("T")[0],
      hora: new Date().toTimeString().slice(0, 5),
      plantonista: "",
      cliente: "",
      tipo_ocorrencia: "",
      veiculo_previsto: "",
      veiculo_substituto: "",
      tipo_socorro: "",
      descricao_socorro: "",
      horario_socorro: "",
      horario_saida: "",
      houve_atraso: false,
      tempo_atraso: "",
      status: "PENDENTE",
      descricao: "",
    },
  });

  // Valores observados para renderização condicional
  const tipoOcorrencia = watch("tipo_ocorrencia");
  const tipoSocorro = watch("tipo_socorro") as TipoSocorroNome | "";
  const houveAtraso = watch("houve_atraso");

  const isSocorro = tipoOcorrencia === "Socorro";
  const tipoSocorroConfig = TIPOS_SOCORRO.find((t) => t.nome === tipoSocorro);
  const requerDescricaoSocorro = tipoSocorroConfig?.requerDescricao ?? false;
  const alertaDiretoria = tipoSocorroConfig?.alertaDiretoria ?? false;
  const isAvaria = tipoSocorro === "Avaria";

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = (data: OcorrenciaFormData) => {
    // Aviso visual para Pane Seca (não bloqueia o envio)
    if (alertaDiretoria) {
      toast({
        title: "⚠️ ALERTA CRÍTICO — Pane Seca",
        description:
          "A diretoria será notificada automaticamente sobre esta ocorrência.",
        variant: "destructive",
      });
    }

    createOcorrencia.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Ocorrência registrada!",
          description: isAvaria
            ? "Ocorrência salva. Considere abrir um workflow de DAI para esta avaria."
            : "A ocorrência foi salva com sucesso.",
        });
        navigate("/ocorrencias");
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="page-title">Nova Ocorrência</h1>
          <p className="page-description">Registre uma nova ocorrência do CCO</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── Card 1: Dados básicos ────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da Ocorrência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data *</Label>
                  <Input id="data" type="date" {...register("data")} />
                  <FieldError message={errors.data?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">Hora *</Label>
                  <Input id="hora" type="time" {...register("hora")} />
                  <FieldError message={errors.hora?.message} />
                </div>
              </div>

              {/* Plantonista */}
              <div className="space-y-2">
                <Label>Plantonista *</Label>
                <Select
                  onValueChange={(v) => setValue("plantonista", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plantonista" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANTONISTAS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.plantonista?.message} />
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <Label>Cliente / Contrato *</Label>
                <Select
                  onValueChange={(v) => setValue("cliente", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesData.length > 0
                      ? clientesData.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                        ))
                      : ["JEEP", "HDH", "CBA", "VILA GALÉ", "MONTE RODOVIAS"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.cliente?.message} />
              </div>

              {/* Tipo de Ocorrência */}
              <div className="space-y-2">
                <Label>Tipo de Ocorrência *</Label>
                <Select
                  onValueChange={(v) => {
                    setValue("tipo_ocorrencia", v, { shouldValidate: true });
                    // Limpa campos de socorro quando tipo muda
                    if (v !== "Socorro") {
                      setValue("tipo_socorro", "");
                      setValue("descricao_socorro", "");
                      setValue("horario_socorro", "");
                      setValue("horario_saida", "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OCORRENCIA.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.tipo_ocorrencia?.message} />
              </div>

              {/* Aprovador */}
              <div className="space-y-2">
                <Label>Aprovador *</Label>
                <Select
                  onValueChange={(v) => setValue("aprovador", v, { shouldValidate: true })}
                  // Busca por texto: Select já filtra por padrão
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aprovador" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosData.filter(u => u.perfil === "aprovador").map((u) => (
                      <SelectItem key={u.id} value={u.nome}>{u.nome} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.aprovador?.message} />
              </div>
            </CardContent>
          </Card>

          {/* ── Card 2: Veículos ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Veículos Envolvidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="veiculo_previsto">Veículo Previsto *</Label>
                <Input
                  id="veiculo_previsto"
                  placeholder="Ex: 121904"
                  {...register("veiculo_previsto")}
                  list="veiculos-list"
                />
                <datalist id="veiculos-list">
                  {veiculosData.map((v) => (
                    <option key={v.id} value={v.placa} />
                  ))}
                </datalist>
                <FieldError message={errors.veiculo_previsto?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="veiculo_substituto">
                  Veículo Substituto{" "}
                  <span className="text-muted-foreground text-xs">(se houve troca)</span>
                </Label>
                <Input
                  id="veiculo_substituto"
                  placeholder="Ex: 121928"
                  {...register("veiculo_substituto")}
                  list="veiculos-list"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Card 3: Socorro — exibido APENAS quando tipo = 'Socorro' ─────── */}
          {isSocorro && (
            <Card className="border-orange-200 bg-orange-50/30 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg text-orange-800">
                  Socorro
                  <span className="ml-2 text-xs font-normal text-orange-600">
                    (obrigatório por ser tipo Socorro)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Código */}
                  <div className="space-y-2">
                    <Label>Código *</Label>
                    <Input value={codigoSocorro} disabled />
                  </div>
                  {/* Turno */}
                  <div className="space-y-2">
                    <Label>Turno *</Label>
                    <Select onValueChange={setTurnoSocorro} value={turnoSocorro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o turno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manhã">Manhã</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                        <SelectItem value="Noite">Noite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Motorista */}
                  <div className="space-y-2">
                    <Label>Motorista *</Label>
                    <Select onValueChange={setMotoristaSocorro} value={motoristaSocorro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuariosData.filter(u => u.cargo === "motorista").map((u) => (
                          <SelectItem key={u.id} value={u.nome}>{u.nome} ({u.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Rota */}
                  <div className="space-y-2">
                    <Label>Rota *</Label>
                    <Input value={rotaSocorro} onChange={e => setRotaSocorro(e.target.value)} placeholder="Informe a rota" />
                  </div>
                  {/* Natureza */}
                  <div className="space-y-2">
                    <Label>Natureza *</Label>
                    <Select onValueChange={setNaturezaSocorro} value={naturezaSocorro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a natureza" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mecânico">Mecânico</SelectItem>
                        <SelectItem value="Elétrico">Elétrico</SelectItem>
                        <SelectItem value="Pneu">Pneu</SelectItem>
                        <SelectItem value="Pane Seca">Pane Seca</SelectItem>
                        <SelectItem value="Avaria">Avaria</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Horários de Socorro */}
                  <div className="space-y-2">
                    <Label htmlFor="horario_inicio_socorro">Início *</Label>
                    <Input
                      id="horario_inicio_socorro"
                      type="time"
                      {...register("horario_socorro", { required: isSocorro })}
                      onBlur={e => {
                        // Limpa fim se for menor que início
                        const inicio = e.target.value;
                        const fim = (document.getElementById("horario_fim_socorro") as HTMLInputElement)?.value;
                        if (inicio && fim && fim < inicio) {
                          setValue("horario_saida", "");
                        }
                      }}
                    />
                    <FieldError message={errors.horario_socorro?.message} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horario_fim_socorro">Fim *</Label>
                    <Input
                      id="horario_fim_socorro"
                      type="time"
                      {...register("horario_saida", { required: isSocorro })}
                      min={watch("horario_socorro") || undefined}
                    />
                    <FieldError message={errors.horario_saida?.message} />
                  </div>
                  {/* Houve Troca */}
                  <div className="space-y-2">
                    <Label>Houve Troca *</Label>
                    <Select onValueChange={v => setHouveTrocaSocorro(v === "Sim")} value={houveTrocaSocorro ? "Sim" : "Não"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Carro Reserva — condicional */}
                  {houveTrocaSocorro && (
                    <div className="space-y-2">
                      <Label>Carro Reserva *</Label>
                      <Select onValueChange={setCarroReservaSocorro} value={carroReservaSocorro}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o carro reserva" />
                        </SelectTrigger>
                        <SelectContent>
                          {veiculosData.filter(v => v.status === "reserva").map((v) => (
                            <SelectItem key={v.id} value={v.placa}>{v.placa} ({v.modelo})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Tipo de Atendimento */}
                  <div className="space-y-2">
                    <Label>Tipo de Atendimento *</Label>
                    <Select onValueChange={setTipoAtendimentoSocorro} value={tipoAtendimentoSocorro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de atendimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Reparo">Reparo</SelectItem>
                        <SelectItem value="Troca">Troca</SelectItem>
                        <SelectItem value="Remoção">Remoção</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Upload de Foto */}
                  <div className="space-y-2">
                    <Label>Upload de Foto *</Label>
                    <Input type="file" multiple accept="image/*" onChange={e => setFotosSocorro(Array.from(e.target.files || []))} />
                    {fotosSocorro.length === 0 && <p className="text-xs text-destructive mt-1">Obrigatório</p>}
                  </div>
                </div>
                {/* Validação visual */}
                {(!turnoSocorro || !motoristaSocorro || !rotaSocorro || !naturezaSocorro || !tipoAtendimentoSocorro || fotosSocorro.length === 0 || (houveTrocaSocorro && !carroReservaSocorro)) && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Preencha todos os campos obrigatórios da seção Socorro</AlertTitle>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Card 4: Atraso ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações de Atraso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Atraso?</Label>
                  <p className="text-sm text-muted-foreground">
                    Marque se houve atraso no socorro
                  </p>
                </div>
                <Switch
                  checked={houveAtraso}
                  onCheckedChange={(v) => {
                    setValue("houve_atraso", v, { shouldValidate: true });
                    if (!v) setValue("tempo_atraso", "");
                  }}
                />
              </div>

              {houveAtraso && (
                <div className="space-y-2">
                  <Label htmlFor="tempo_atraso">Quantos minutos? *</Label>
                  <Input
                    id="tempo_atraso"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Ex: 15"
                    {...register("tempo_atraso", { required: houveAtraso })}
                  />
                  <FieldError message={errors.tempo_atraso?.message} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Card 5: Status e Descrição ───────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status e Descrição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  defaultValue="PENDENTE"
                  onValueChange={(v) =>
                    setValue("status", v as OcorrenciaFormData["status"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.status?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada *</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva a ocorrência em detalhes…"
                  className="min-h-[120px]"
                  {...register("descricao")}
                />
                <FieldError message={errors.descricao?.message} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Resumo de erros ao tentar submeter ───────────────────────────── */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Corrija os campos obrigatórios</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                {Object.values(errors).map((e, i) => (
                  <li key={i}>{e?.message as string}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Botões ─────────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createOcorrencia.isPending || isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {createOcorrencia.isPending ? "Salvando…" : "Salvar Ocorrência"}
          </Button>
        </div>
      </form>
    </div>
  );
}
