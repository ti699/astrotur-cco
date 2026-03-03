// ============================================
// SISTEMA CCO v2.0 - Tipos Centralizados
// ============================================

// Tipos de Socorro/Quebra
export type TipoSocorroNome = 'Mecânico' | 'Elétrico' | 'Pneu' | 'Pane Seca' | 'Avaria' | 'Outros';

export interface TipoSocorro {
  id: string;
  nome: TipoSocorroNome;
  requerDescricao: boolean;
  alertaDiretoria: boolean;
}

export const TIPOS_SOCORRO: TipoSocorro[] = [
  { id: 'mecanico', nome: 'Mecânico', requerDescricao: false, alertaDiretoria: false },
  { id: 'eletrico', nome: 'Elétrico', requerDescricao: false, alertaDiretoria: false },
  { id: 'pneu', nome: 'Pneu', requerDescricao: false, alertaDiretoria: false },
  { id: 'pane_seca', nome: 'Pane Seca', requerDescricao: false, alertaDiretoria: true },
  { id: 'avaria', nome: 'Avaria', requerDescricao: false, alertaDiretoria: false },
  { id: 'outros', nome: 'Outros', requerDescricao: true, alertaDiretoria: false },
];

// Status do Workflow de Avaria
export type AvariaStatus = 
  | 'AGUARDANDO_FOTO_PORTARIA' 
  | 'AGUARDANDO_DAI' 
  | 'AGUARDANDO_PRECIFICACAO' 
  | 'PRECIFICADO' 
  | 'AGUARDANDO_JULGAMENTO' 
  | 'JULGADO_COBRADO' 
  | 'JULGADO_ABONADO';

export interface AvariaWorkflow {
  id: string;
  numeroTalao: string;
  status: AvariaStatus;
  responsavelAtual: string;
  dataAbertura: Date;
  usuarioAbertura: string;
  veiculoId: string;
  motoristaId: string;
  fotoUrl?: string;
  fotoDataHora?: Date;
  fotoUsuario?: string;
  daiPreenchido: boolean;
  daiDataHora?: Date;
  daiUsuario?: string;
  valorEstimado?: number;
  precificacaoDataHora?: Date;
  precificacaoUsuario?: string;
  decisao?: 'COBRADO' | 'ABONADO';
  percentualDesconto?: number;
  julgamentoDataHora?: Date;
  julgamentoJustificativa?: string;
}

// Passagem de Bastão / Finalizar Plantão
export interface PassagemBastao {
  id: string;
  plantonistaAnterior: string;
  plantonistaSeguinte: string;
  pendenciasPassadas: string[];
  dataHora: Date;
  turnoInicio: Date;
  turnoFim: Date;
  relatorioUrl?: string;
  totalOcorrencias: number;
  totalAtrasos: number;
  totalSocorros: number;
  totalTrocasVeiculo: number;
}

// SLA de Cliente
export interface ClienteSLA {
  clienteId: string;
  clienteNome: string;
  tempoMaximoResposta: number; // em minutos
  requisitos: {
    arCondicionado: boolean;
    anoMinimoVeiculo?: number;
    tipoVeiculoPermitido?: string[];
    motoristaTreinamentoEspecifico?: boolean;
  };
  multaDescumprimento?: number;
}

// Auditoria
export type EntidadeTipo = 'ocorrencia' | 'avaria' | 'portaria' | 'veiculo' | 'motorista';

export interface AuditLog {
  id: string;
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  acao: string;
  statusAnterior?: string;
  statusNovo?: string;
  usuarioId: string;
  usuarioNome: string;
  dataHora: Date;
  detalhes?: Record<string, unknown>;
}

// Histórico de Conduta do Motorista
export interface HistoricoCondutaMotorista {
  motoristaId: string;
  motoristaNome: string;
  dataAdmissao: Date;
  totalAvarias: number;
  avariasCobradas: number;
  avariasAbonadas: number;
  percentualCobrado: number;
  advertencias: number;
  historicoDAIs: {
    numeroTalao: string;
    data: Date;
    tipoAvaria: string;
    valorEstimado: number;
    decisao: 'COBRADO' | 'ABONADO';
    percentualDesconto?: number;
  }[];
}

// Ocorrência
export type StatusOcorrencia = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';

export interface Ocorrencia {
  id: string;
  data: Date;
  hora: string;
  plantonista: string;
  cliente: string;
  tipoOcorrencia: string;
  tipoSocorro?: TipoSocorroNome;
  tipoSocorroDescricao?: string; // Obrigatório se tipoSocorro === 'Outros'
  veiculoPrevisto: string;
  veiculoSubstituido?: string;
  motoristaId?: string;
  horarioSocorro?: string;
  horarioSaidaSocorro?: string;
  houveAtraso: boolean;
  tempoAtraso?: string;
  status: StatusOcorrencia;
  descricao: string;
  aprovador?: string;
}

// KM Morto / Improdutivo (Refinado)
export interface KmMortoRegistro {
  veiculoId: string;
  veiculoNumero: string;
  data: Date;
  kmSaidaGaragem: number;
  kmInicioRota: number;
  kmFimRota: number;
  kmEntradaGaragem: number;
  kmProdutivo: number; // kmFimRota - kmInicioRota
  kmMorto: number; // (kmInicioRota - kmSaidaGaragem) + (kmEntradaGaragem - kmFimRota)
  motivo: string;
}

// Resumo do Plantão para PDF
export interface ResumoPlantao {
  plantonista: string;
  turnoInicio: Date;
  turnoFim: Date;
  ocorrencias: Ocorrencia[];
  pendencias: Ocorrencia[];
  totais: {
    totalOcorrencias: number;
    atrasos: number;
    socorros: number;
    trocasVeiculo: number;
    avarias: number;
  };
}
