import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Upload,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { DiagramaOnibus } from "@/components/avarias/DiagramaOnibus";
import type { AvariaStatus } from "@/types";

interface NovaAvariaWorkflowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvariaCreated?: (avaria: any) => void;
}

const veiculos = ["121904", "102104", "101318", "2408", "2536", "122420"];
const motoristas = [
  { id: "1", nome: "SANDRO MARQUES", matricula: "03892" },
  { id: "2", nome: "EDUARDO PEREIRA", matricula: "03486" },
  { id: "3", nome: "PAULO SÉRGIO", matricula: "04521" },
  { id: "4", nome: "JOSÉ CARLOS", matricula: "05123" },
];

const tiposAvaria = [
  "CURVÃO",
  "COLISÃO",
  "VIDRO",
  "LATARIA",
  "RETROVISOR",
  "PARA-CHOQUE",
  "FAROL/LANTERNA",
  "OUTROS",
];

const locaisVeiculo = [
  "Frontal",
  "Traseiro",
  "Lateral esquerda",
  "Lateral direita",
  "Traseiro lado esquerdo",
  "Traseiro lado direito",
  "Frontal lado esquerdo",
  "Frontal lado direito",
  "Teto",
];

// Gera número sequencial do DAI
let daiSequence = 134;
const gerarNumeroDai = () => {
  const numero = `DAI-${daiSequence}`;
  daiSequence++;
  return numero;
};

const getStatusInfo = (status: AvariaStatus) => {
  switch (status) {
    case "AGUARDANDO_FOTO_PORTARIA":
      return {
        label: "Aguardando Foto (Portaria)",
        color: "bg-amber-100 text-amber-800",
        icon: Camera,
        step: 1,
      };
    case "AGUARDANDO_DAI":
      return {
        label: "Aguardando DAI (CCO)",
        color: "bg-blue-100 text-blue-800",
        icon: FileText,
        step: 2,
      };
    case "AGUARDANDO_PRECIFICACAO":
      return {
        label: "Aguardando Precificação (Manutenção)",
        color: "bg-purple-100 text-purple-800",
        icon: DollarSign,
        step: 3,
      };
    case "PRECIFICADO":
      return {
        label: "Precificado",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        step: 4,
      };
    default:
      return {
        label: status,
        color: "bg-gray-100 text-gray-800",
        icon: Clock,
        step: 0,
      };
  }
};

export function NovaAvariaWorkflow({
  open,
  onOpenChange,
  onAvariaCreated,
}: NovaAvariaWorkflowProps) {
  const { toast } = useToast();
  const { registrarLog } = useAuditLog();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    numeroTalao: "",
    veiculo: "",
    motorista: "",
    tipoAvaria: "",
    localVeiculo: "",
    descricao: "",
    fotoFile: null as File | null,
    fotoPreview: "",
  });

  // Gerar número do DAI quando abrir
  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        numeroTalao: gerarNumeroDai(),
      }));
      setStep(1);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        fotoFile: file,
        fotoPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleStep1Submit = () => {
    if (!formData.veiculo || !formData.motorista) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o veículo e o motorista.",
        variant: "destructive",
      });
      return;
    }

    // Registrar log de auditoria - criação da avaria
    registrarLog(
      "avaria",
      formData.numeroTalao,
      "AVARIA_CRIADA",
      undefined,
      "AGUARDANDO_FOTO_PORTARIA",
      {
        veiculo: formData.veiculo,
        motorista: formData.motorista,
      }
    );

    toast({
      title: "Avaria Iniciada",
      description: `${formData.numeroTalao} aguardando foto da Portaria (Rafael).`,
    });

    setStep(2);
  };

  const handleStep2Submit = () => {
    if (!formData.fotoFile) {
      toast({
        title: "Foto obrigatória",
        description: "É necessário anexar a foto do dano para continuar.",
        variant: "destructive",
      });
      return;
    }

    // Registrar log de auditoria - foto anexada
    registrarLog(
      "avaria",
      formData.numeroTalao,
      "FOTO_ANEXADA",
      "AGUARDANDO_FOTO_PORTARIA",
      "AGUARDANDO_DAI",
      { fotoNome: formData.fotoFile.name }
    );

    toast({
      title: "Foto Anexada",
      description: "Agora o CCO pode preencher o talão DAI.",
    });

    setStep(3);
  };

  const handleStep3Submit = () => {
    if (!formData.tipoAvaria || !formData.localVeiculo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o tipo de avaria e local do veículo.",
        variant: "destructive",
      });
      return;
    }

    // Registrar log de auditoria - DAI preenchido
    registrarLog(
      "avaria",
      formData.numeroTalao,
      "DAI_PREENCHIDO",
      "AGUARDANDO_DAI",
      "AGUARDANDO_PRECIFICACAO",
      {
        tipoAvaria: formData.tipoAvaria,
        localVeiculo: formData.localVeiculo,
      }
    );

    toast({
      title: "DAI Preenchido",
      description: "Avaria enviada para precificação da Manutenção.",
    });

    // Criar objeto da avaria
    const novaAvaria = {
      id: Date.now(),
      numeroTalao: formData.numeroTalao,
      data: new Date().toLocaleDateString("pt-BR"),
      veiculo: formData.veiculo,
      motorista:
        motoristas.find((m) => m.id === formData.motorista)?.nome || "",
      tipoAvaria: formData.tipoAvaria,
      localVeiculo: formData.localVeiculo,
      descricao: formData.descricao,
      status: "AGUARDANDO_PRECIFICACAO" as AvariaStatus,
      daiPreenchido: true,
      fotoUrl: formData.fotoPreview,
    };

    onAvariaCreated?.(novaAvaria);
    onOpenChange(false);

    // Reset form
    setFormData({
      numeroTalao: "",
      veiculo: "",
      motorista: "",
      tipoAvaria: "",
      localVeiculo: "",
      descricao: "",
      fotoFile: null,
      fotoPreview: "",
    });
    setStep(1);
  };

  const stepProgress = (step / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Nova Avaria - Workflow
              </DialogTitle>
              <DialogDescription>
                {formData.numeroTalao && (
                  <span className="font-mono font-bold text-primary">
                    {formData.numeroTalao}
                  </span>
                )}
              </DialogDescription>
            </div>
            <Badge className={getStatusInfo(
              step === 1 ? "AGUARDANDO_FOTO_PORTARIA" :
              step === 2 ? "AGUARDANDO_FOTO_PORTARIA" :
              "AGUARDANDO_DAI"
            ).color}>
              Etapa {step} de 3
            </Badge>
          </div>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={stepProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className={`flex items-center gap-1 ${step >= 1 ? "text-primary font-medium" : ""}`}>
              <User className="h-3 w-3" />
              <span>1. Identificação</span>
            </div>
            <div className={`flex items-center gap-1 ${step >= 2 ? "text-primary font-medium" : ""}`}>
              <Camera className="h-3 w-3" />
              <span>2. Foto (Portaria)</span>
            </div>
            <div className={`flex items-center gap-1 ${step >= 3 ? "text-primary font-medium" : ""}`}>
              <FileText className="h-3 w-3" />
              <span>3. DAI (CCO)</span>
            </div>
          </div>
        </div>

        {/* Step 1: Identificação */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Início do Workflow</AlertTitle>
              <AlertDescription>
                Preencha os dados iniciais. Após confirmar, a Portaria (Rafael)
                será notificada para tirar a foto do dano.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Talão</Label>
                <Input value={formData.numeroTalao} disabled className="font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label>Data/Hora Abertura</Label>
                <Input
                  value={new Date().toLocaleString("pt-BR")}
                  disabled
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select
                  value={formData.veiculo}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, veiculo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {veiculos.map((v) => (
                      <SelectItem key={v} value={v}>
                        #{v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motorista *</Label>
                <Select
                  value={formData.motorista}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, motorista: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    {motoristas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} ({m.matricula})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações Iniciais</Label>
              <Textarea
                placeholder="Descreva brevemente o ocorrido..."
                value={formData.descricao}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descricao: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        {/* Step 2: Foto da Portaria */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <Camera className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Etapa da Portaria</AlertTitle>
              <AlertDescription className="text-amber-700">
                Rafael (Portaria) deve tirar a foto do dano. A foto é
                <strong> obrigatória</strong> para prosseguir.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              {formData.fotoPreview ? (
                <div className="space-y-4">
                  <img
                    src={formData.fotoPreview}
                    alt="Preview do dano"
                    className="max-h-64 mx-auto rounded-lg shadow-md"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        fotoFile: null,
                        fotoPreview: "",
                      }))
                    }
                  >
                    Remover e escolher outra
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Arraste a foto ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">
                      Formatos aceitos: JPG, PNG (máx. 5MB)
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="max-w-xs mx-auto"
                  />
                </>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Usuário que está anexando: </span>
                <span className="font-medium text-foreground">RAFAEL (Portaria)</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preenchimento DAI pelo CCO */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Etapa do CCO</AlertTitle>
              <AlertDescription className="text-blue-700">
                Preencha os dados do talão DAI. Após salvar, a avaria será
                enviada para precificação da Manutenção.
              </AlertDescription>
            </Alert>

            {formData.fotoPreview && (
              <div className="flex gap-4">
                <img
                  src={formData.fotoPreview}
                  alt="Foto do dano"
                  className="h-24 w-24 object-cover rounded-lg border"
                />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Foto anexada</p>
                  <p className="text-xs text-muted-foreground">
                    Veículo: #{formData.veiculo}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Motorista: {motoristas.find((m) => m.id === formData.motorista)?.nome}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Avaria *</Label>
                <Select
                  value={formData.tipoAvaria}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, tipoAvaria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAvaria.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Local no Veículo *</Label>
                <DiagramaOnibus
                  value={formData.localVeiculo}
                  onChange={(v) => setFormData((prev) => ({ ...prev, localVeiculo: v }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição Detalhada</Label>
              <Textarea
                placeholder="Descreva detalhadamente o dano observado..."
                value={formData.descricao}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descricao: e.target.value }))
                }
                className="min-h-[100px]"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          {step === 1 && (
            <Button onClick={handleStep1Submit}>
              Iniciar Workflow
              <Camera className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleStep2Submit} disabled={!formData.fotoFile}>
              Confirmar Foto
              <FileText className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleStep3Submit}>
              Enviar para Precificação
              <DollarSign className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
