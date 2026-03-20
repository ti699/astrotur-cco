import { z } from 'zod';

// ─── Enums espelhados do domínio ──────────────────────────────────────────────

export const TIPOS_OCORRENCIA = [
  'Atraso',
  'Comunicação ao cliente',
  'Falta de motorista',
  'Informação',
  'N/A',
  'Quebra',
  'Retido',
  'Serviço',
  'Socorro',
] as const;

export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number];

export const STATUS_OCORRENCIA = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'] as const;

// ─── Regra: campos de socorro só são obrigatórios se tipo === 'Socorro' ───────

export const ocorrenciaSchema = z
  .object({
    // ── Dados básicos ──────────────────────────────────────────────────────────
    data: z.string().min(1, 'Data obrigatória'),
    hora: z.string().min(1, 'Hora obrigatória'),
    plantonista: z.string().min(1, 'Plantonista obrigatório'),
    cliente: z.string().min(1, 'Cliente obrigatório'),
    tipo_ocorrencia: z.string().min(1, 'Tipo de ocorrência obrigatório'),

    // ── Veículos ───────────────────────────────────────────────────────────────
    veiculo_previsto: z.string().min(1, 'Veículo previsto obrigatório'),
    veiculo_substituto: z.string().optional().default(''),

    // ── Socorro — condicionalmente obrigatórios ────────────────────────────────
    tipo_socorro: z.string().optional().default(''),
    descricao_socorro: z.string().optional().default(''),
    horario_socorro: z.string().optional().default(''), // Início
    horario_saida: z.string().optional().default(''),   // Fim

    // ── Atraso — condicionalmente obrigatório ──────────────────────────────────
    houve_atraso: z.boolean().default(false),
    tempo_atraso: z.union([z.string(), z.number()]).optional().default(''),

    // ── Conclusão ──────────────────────────────────────────────────────────────
    status: z.enum(STATUS_OCORRENCIA).default('PENDENTE'),
    descricao: z.string().min(1, 'Descrição obrigatória'),
  })
  .superRefine((data, ctx) => {
    // Regras condicionais para tipo = 'Socorro'
    if (data.tipo_ocorrencia === 'Socorro') {
      if (!data.tipo_socorro) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tipo de socorro obrigatório quando Tipo = Socorro',
          path: ['tipo_socorro'],
        });
      }

      if (!data.horario_socorro) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Horário de início obrigatório quando Tipo = Socorro',
          path: ['horario_socorro'],
        });
      }
      if (!data.horario_saida) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Horário de fim obrigatório quando Tipo = Socorro',
          path: ['horario_saida'],
        });
      }
      // Fim não pode ser menor que início
      if (data.horario_socorro && data.horario_saida && data.horario_saida < data.horario_socorro) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O horário de fim não pode ser menor que o de início',
          path: ['horario_saida'],
        });
      }

      // 'Outros' exige descrição detalhada
      if (data.tipo_socorro === 'Outros' && !data.descricao_socorro?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Descreva o tipo de socorro quando selecionar "Outros"',
          path: ['descricao_socorro'],
        });
      }
    }

    // Regra condicional para houve_atraso
    if (data.houve_atraso) {
      if (!data.tempo_atraso && data.tempo_atraso !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o tempo de atraso em minutos',
          path: ['tempo_atraso'],
        });
      } else if (Number(data.tempo_atraso) <= 0 || isNaN(Number(data.tempo_atraso))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O tempo de atraso deve ser maior que zero',
          path: ['tempo_atraso'],
        });
      }
    }
  });

export type OcorrenciaFormData = z.infer<typeof ocorrenciaSchema>;

// ─── Utilitário: converte "HH:MM" para minutos inteiros ───────────────────────
export function horaParaMinutos(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
