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
import { useCreateOcorrencia, useClientes, useVeiculos } from "@/services/useApi";

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
                  Detalhes do Socorro
                  <span className="ml-2 text-xs font-normal text-orange-600">
                    (obrigatório por ser tipo Socorro)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Tipo de socorro */}
                  <div className="space-y-2">
                    <Label>Tipo de Socorro *</Label>
                    <Select
                      onValueChange={(v) =>
                        setValue("tipo_socorro", v, { shouldValidate: true })
                      }
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
                    <FieldError message={errors.tipo_socorro?.message} />
                  </div>

                  {/* Horários */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="horario_socorro">Horário do Socorro *</Label>
                      <Input id="horario_socorro" type="time" {...register("horario_socorro")} />
                      <FieldError message={errors.horario_socorro?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="horario_saida">Horário Saída</Label>
                      <Input id="horario_saida" type="time" {...register("horario_saida")} />
                    </div>
                  </div>
                </div>

                {/* Descrição para "Outros" */}
                {requerDescricaoSocorro && (
                  <div className="space-y-2">
                    <Label htmlFor="descricao_socorro">Descrição do Socorro *</Label>
                    <Textarea
                      id="descricao_socorro"
                      placeholder='Descreva o tipo de socorro (obrigatório para "Outros")…'
                      className="min-h-[80px]"
                      {...register("descricao_socorro")}
                    />
                    <FieldError message={errors.descricao_socorro?.message} />
                  </div>
                )}

                {/* Alerta Pane Seca */}
                {alertaDiretoria && (
                  <Alert variant="destructive" className="bg-red-50 border-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Alerta Crítico — Pane Seca</AlertTitle>
                    <AlertDescription>
                      Esta é uma falha operacional evitável. A diretoria será
                      notificada automaticamente ao salvar.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alerta Avaria */}
                {isAvaria && (
                  <Alert className="bg-amber-50 border-amber-300">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Sugestão: Abrir workflow de DAI</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      Após salvar, considere abrir um novo workflow de DAI em Avarias
                      para iniciar o processo de precificação.
                    </AlertDescription>
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
                  <Label>Houve Atraso?</Label>
                  <p className="text-sm text-muted-foreground">
                    Marque se a ocorrência causou atraso na operação
                  </p>
                </div>
                <Switch
                  checked={houveAtraso}
                  onCheckedChange={(v) =>
                    setValue("houve_atraso", v, { shouldValidate: true })
                  }
                />
              </div>

              {houveAtraso && (
                <div className="space-y-2">
                  <Label htmlFor="tempo_atraso">Tempo de Atraso (HH:MM) *</Label>
                  <Input id="tempo_atraso" type="time" {...register("tempo_atraso")} />
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
