import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Clock,
  Thermometer,
  Calendar,
  Bus,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import type { ClienteSLA } from "@/types";

interface SLATooltipProps {
  cliente: string;
  children: React.ReactNode;
}

// Mock de SLAs dos clientes
const clienteSLAs: Record<string, ClienteSLA> = {
  JEEP: {
    clienteId: "jeep",
    clienteNome: "JEEP",
    tempoMaximoResposta: 120, // 2 horas
    requisitos: {
      arCondicionado: true,
      anoMinimoVeiculo: 2020,
      tipoVeiculoPermitido: ["EXECUTIVO", "MICRO"],
      motoristaTreinamentoEspecifico: true,
    },
    multaDescumprimento: 500,
  },
  HDH: {
    clienteId: "hdh",
    clienteNome: "HDH",
    tempoMaximoResposta: 90, // 1h30
    requisitos: {
      arCondicionado: true,
      anoMinimoVeiculo: 2018,
      tipoVeiculoPermitido: ["EXECUTIVO"],
      motoristaTreinamentoEspecifico: false,
    },
    multaDescumprimento: 350,
  },
  TECON: {
    clienteId: "tecon",
    clienteNome: "TECON",
    tempoMaximoResposta: 60, // 1 hora
    requisitos: {
      arCondicionado: true,
      anoMinimoVeiculo: 2019,
      tipoVeiculoPermitido: ["ONIBUS", "MICRO"],
      motoristaTreinamentoEspecifico: true,
    },
    multaDescumprimento: 800,
  },
  CBA: {
    clienteId: "cba",
    clienteNome: "CBA",
    tempoMaximoResposta: 180, // 3 horas
    requisitos: {
      arCondicionado: false,
      anoMinimoVeiculo: 2015,
      motoristaTreinamentoEspecifico: false,
    },
    multaDescumprimento: 200,
  },
  "VILA GALÉ": {
    clienteId: "vila_gale",
    clienteNome: "VILA GALÉ",
    tempoMaximoResposta: 45, // 45 min
    requisitos: {
      arCondicionado: true,
      anoMinimoVeiculo: 2021,
      tipoVeiculoPermitido: ["EXECUTIVO", "VAN EXECUTIVA"],
      motoristaTreinamentoEspecifico: true,
    },
    multaDescumprimento: 1000,
  },
};

const formatarTempo = (minutos: number): string => {
  if (minutos < 60) return `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (mins === 0) return `${horas}h`;
  return `${horas}h${mins}min`;
};

export function SLATooltip({ cliente, children }: SLATooltipProps) {
  const sla = clienteSLAs[cliente];

  if (!sla) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="inline-flex items-center gap-1 cursor-help">
          {children}
          <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="right">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{sla.clienteNome}</h4>
            <Badge variant="outline" className="text-xs">
              SLA Contratual
            </Badge>
          </div>

          {/* Tempo de Resposta */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Tempo Máximo de Resposta</p>
              <p className="text-xs text-muted-foreground">
                {formatarTempo(sla.tempoMaximoResposta)}
              </p>
            </div>
          </div>

          {/* Requisitos */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Requisitos do Contrato
            </p>

            <div className="grid gap-1.5">
              {sla.requisitos.arCondicionado && (
                <div className="flex items-center gap-2 text-sm">
                  <Thermometer className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Ar-condicionado obrigatório</span>
                </div>
              )}

              {sla.requisitos.anoMinimoVeiculo && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-purple-600" />
                  <span>Ano mínimo: {sla.requisitos.anoMinimoVeiculo}</span>
                </div>
              )}

              {sla.requisitos.tipoVeiculoPermitido && (
                <div className="flex items-center gap-2 text-sm">
                  <Bus className="h-3.5 w-3.5 text-green-600" />
                  <span>
                    Tipos: {sla.requisitos.tipoVeiculoPermitido.join(", ")}
                  </span>
                </div>
              )}

              {sla.requisitos.motoristaTreinamentoEspecifico && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-600" />
                  <span>Motorista com treinamento específico</span>
                </div>
              )}
            </div>
          </div>

          {/* Multa */}
          {sla.multaDescumprimento && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Multa por Descumprimento
                </p>
                <p className="text-xs text-red-600">
                  R$ {sla.multaDescumprimento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
