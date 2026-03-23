/**
 * Hooks TanStack Query — integração com backend Express API.
 * Todas as chamadas passam pelo backend em vez do Supabase direto.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOcorrencias: number;
  atrasos: number;
  veiculosAtribuidos: number;
  tempoMedioAtendimento: string;
  ocorrenciasHoje: number;
  comparacaoMesAnterior: number;
  comparacaoAtrasos: number;
}

export interface DashboardResumo {
  stats: DashboardStats;
  veiculosPorTipo: { tipo: string; total: number }[];
}

export interface Ocorrencia {
  id: number;
  numero_ocorrencia?: string;
  numero?: string;
  cliente_nome?: string;
  monitor_nome?: string;
  data_ocorrencia?: string;
  data_quebra?: string;
  tipo_ocorrencia?: string;
  tipo_socorro?: string | null;
  descricao_socorro?: string | null;
  tipo_quebra_nome?: string;
  veiculo_placa?: string;
  houve_troca_veiculo?: boolean;
  veiculo_substituto_placa?: string;
  horario_socorro?: string;
  horario_saida?: string;
  houve_atraso?: boolean;
  tempo_atraso?: string;
  descricao?: string;
  status?: string;
  created_at?: string;
}

export interface Veiculo {
  id: number;
  placa: string;
  numero_frota?: string;
  modelo?: string;
  marca?: string;
  tipo?: string;
  ano?: number;
  cliente_id?: number;
  cliente_nome?: string;
  km_atual?: number;
  status?: string;
  localizacao?: string;
  ativo?: boolean;
}

export interface Cliente {
  id: number;
  nome: string;
  cnpj?: string;
  contato?: string;
  email?: string;
  endereco?: string;
  sla_horas?: number;
  sla_nivel?: string;
  sla_requisitos?: string;
  prioridade_1?: string;
  prioridade_2?: string;
  prioridade_3?: string;
  ano_frota?: string;
  ativo?: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  cargo?: string;
  ativo?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mapeia row retornado pelo backend para o tipo Ocorrencia do frontend */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOcorrencia(row: any): Ocorrencia {
  const atrasoMin: number = row.atraso_minutos ?? 0;
  const tempoAtrasoFormatado = atrasoMin > 0
    ? `${String(Math.floor(atrasoMin / 60)).padStart(2, '0')}:${String(atrasoMin % 60).padStart(2, '0')}`
    : '';
  return {
    id: row.id,
    numero_ocorrencia: row.numero_ocorrencia ?? row.numero,
    numero: row.numero_ocorrencia ?? row.numero,
    cliente_nome: row.cliente_nome ?? row.clientes?.nome,
    monitor_nome: row.monitor_nome ?? row.usuarios?.nome ?? row.plantonista,
    data_ocorrencia: row.data_ocorrencia ?? row.data_quebra ?? row.data_chamado,
    data_quebra: row.data_ocorrencia ?? row.data_quebra ?? row.data_chamado,
    tipo_ocorrencia: row.tipo_ocorrencia,
    tipo_socorro: row.tipo_socorro ?? null,
    descricao_socorro: row.descricao_socorro ?? null,
    tipo_quebra_nome: row.tipo_quebra_nome ?? row.tipos_quebra?.nome,
    veiculo_placa: row.veiculo_placa ?? row.veiculo_previsto,
    houve_troca_veiculo: row.houve_troca_veiculo ?? false,
    veiculo_substituto_placa: row.veiculo_substituto_placa ?? row.veiculo_substituto,
    horario_socorro: row.horario_socorro ?? null,
    horario_saida: row.horario_saida_socorro ?? row.horario_saida ?? null,
    houve_atraso: row.houve_atraso ?? false,
    tempo_atraso: tempoAtrasoFormatado,
    descricao: row.descricao,
    status: row.status,
    created_at: row.created_at,
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery<DashboardResumo>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/resumo');
      return data as DashboardResumo;
    },
    staleTime: 1000 * 30,
    retry: 2,
  });
}

// ─── Ocorrências ──────────────────────────────────────────────────────────────

export function useOcorrencias() {
  return useQuery<Ocorrencia[]>({
    queryKey: ['ocorrencias'],
    queryFn: async () => {
      const { data } = await api.get('/ocorrencias');
      // backend retorna { dados: [...], paginacao: {...} } ou array direto
      const rows = Array.isArray(data) ? data : (data?.dados ?? []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rows.map((r: any) => mapOcorrencia(r));
    },
    staleTime: 1000 * 20,
    retry: 2,
  });
}

export function useCreateOcorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: import('@/schemas/ocorrenciaSchema').OcorrenciaFormData) => {
      const { horaParaMinutos } = await import('@/schemas/ocorrenciaSchema');
      const atraso_minutos = payload.houve_atraso
        ? horaParaMinutos(payload.tempo_atraso ?? '')
        : 0;

      const data_hora = payload.hora
        ? `${payload.data}T${payload.hora}:00`
        : `${payload.data}T00:00:00`;

      const { data: row } = await api.post('/ocorrencias', {
        tipo_ocorrencia: payload.tipo_ocorrencia,
        cliente: payload.cliente,
        plantonista: payload.plantonista,
        data_hora,
        veiculo_previsto: payload.veiculo_previsto,
        veiculo_substituto: payload.veiculo_substituto || null,
        horario_inicio_socorro: payload.horario_socorro || null,
        horario_fim_socorro: payload.horario_saida || null,
        houve_atraso: payload.houve_atraso,
        atraso_minutos,
        status: payload.status || 'pendente',
        descricao: payload.descricao,
        tipo_socorro: payload.tipo_socorro || null,
        descricao_socorro: payload.descricao_socorro || null,
        houve_troca_veiculo: Boolean(payload.veiculo_substituto),
      });

      return mapOcorrencia(row);
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<Ocorrencia[]>(['ocorrencias'], (old = []) => [newItem, ...old]);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Ocorrência registrada!', description: `Nº ${newItem.numero_ocorrencia}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateOcorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown>) => {
      const { data: row } = await api.put(`/ocorrencias/${id}`, {
        descricao: payload.descricao,
        status: payload.status,
      });
      return mapOcorrencia(row);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Ocorrencia[]>(['ocorrencias'], (old = []) =>
        old.map((o) => (o.id === updated.id ? updated : o))
      );
      toast({ title: 'Ocorrência atualizada!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteOcorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ocorrencias/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Ocorrencia[]>(['ocorrencias'], (old = []) =>
        old.filter((o) => o.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Ocorrência excluída.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Veículos ─────────────────────────────────────────────────────────────────

export function useVeiculos() {
  return useQuery<Veiculo[]>({
    queryKey: ['veiculos'],
    queryFn: async () => {
      const { data } = await api.get('/veiculos');
      return (data ?? []) as Veiculo[];
    },
    staleTime: 1000 * 60,
    retry: 2,
  });
}

export function useCreateVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Veiculo>) => {
      const { data } = await api.post('/veiculos', payload);
      return data as Veiculo;
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) => [novo, ...old]);
      toast({ title: 'Veículo cadastrado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Veiculo> & { id: number }) => {
      const { data } = await api.put(`/veiculos/${id}`, payload);
      return data as Veiculo;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) =>
        old.map((v) => (v.id === updated.id ? updated : v))
      );
      toast({ title: 'Veículo atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/veiculos/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) =>
        old.filter((v) => v.id !== id)
      );
      toast({ title: 'Veículo excluído.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await api.get('/clientes');
      return (data ?? []) as Cliente[];
    },
    staleTime: 1000 * 60,
    retry: 2,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Cliente>) => {
      const { data } = await api.post('/clientes', { ...payload, ativo: true });
      return data as Cliente;
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Cliente[]>(['clientes'], (old = []) => [novo, ...old]);
      toast({ title: 'Cliente cadastrado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Cliente> & { id: number }) => {
      const { data } = await api.put(`/clientes/${id}`, payload);
      return data as Cliente;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Cliente[]>(['clientes'], (old = []) =>
        old.map((c) => (c.id === updated.id ? updated : c))
      );
      toast({ title: 'Cliente atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/clientes/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Cliente[]>(['clientes'], (old = []) =>
        old.filter((c) => c.id !== id)
      );
      toast({ title: 'Cliente excluído.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

export function useUsuarios() {
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data } = await api.get('/usuarios');
      return (data ?? []) as Usuario[];
    },
    staleTime: 1000 * 60,
    retry: 2,
  });
}

export function useCreateUsuario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Usuario> & { senha?: string }) => {
      const { data } = await api.post('/usuarios', {
        nome: payload.nome,
        email: payload.email,
        senha: payload.senha || 'mudar@123',
        cargo: payload.cargo || null,
        perfil: payload.perfil || 'portaria',
      });
      return data as Usuario;
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Usuario[]>(['usuarios'], (old = []) => [novo, ...old]);
      toast({ title: 'Usuário cadastrado!', description: 'Senha definida conforme informado.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, senha, ...payload }: Partial<Usuario> & { id: number; senha?: string }) => {
      const { data } = await api.put(`/usuarios/${id}`, {
        nome: payload.nome,
        email: payload.email,
        cargo: payload.cargo,
        perfil: payload.perfil,
        ativo: payload.ativo,
        ...(senha ? { senha } : {}),
      });
      return data as Usuario;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Usuario[]>(['usuarios'], (old = []) =>
        old.map((u) => (u.id === updated.id ? updated : u))
      );
      toast({ title: 'Usuário atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });
}
