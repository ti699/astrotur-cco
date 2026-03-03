/**
 * Hooks TanStack Query para integração com o backend.
 * Cada hook gerencia cache, loading state e erro automaticamente.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import api from './api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  tipo_quebra_nome?: string;
  veiculo_placa?: string;
  houve_troca_veiculo?: string;
  veiculo_substituto_placa?: string;
  horario_socorro?: string;
  horario_saida?: string;
  houve_atraso?: string;
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery<DashboardResumo>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/resumo');
      return data;
    },
    staleTime: 1000 * 30, // 30 segundos
    retry: 2,
  });
}

// ─── Ocorrências ──────────────────────────────────────────────────────────────

export function useOcorrencias() {
  return useQuery<Ocorrencia[]>({
    queryKey: ['ocorrencias'],
    queryFn: async () => {
      const { data } = await api.get('/ocorrencias');
      return data;
    },
    staleTime: 1000 * 20,
  });
}

export function useCreateOcorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/ocorrencias', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Ocorrência registrada!', description: 'Salva com sucesso.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar ocorrência', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateOcorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown>) => {
      const { data } = await api.put(`/ocorrencias/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
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
      return data;
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Veiculo>) => {
      const { data } = await api.post('/veiculos', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      toast({ title: 'Veículo cadastrado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao cadastrar veículo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Veiculo> & { id: number }) => {
      const { data } = await api.put(`/veiculos/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      toast({ title: 'Veículo atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar veículo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/veiculos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      toast({ title: 'Veículo excluído.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir veículo', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await api.get('/clientes');
      return data;
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Cliente>) => {
      const { data } = await api.post('/clientes', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: 'Cliente cadastrado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao cadastrar cliente', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Cliente> & { id: number }) => {
      const { data } = await api.put(`/clientes/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: 'Cliente atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar cliente', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/clientes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: 'Cliente excluído.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir cliente', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

export function useUsuarios() {
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data } = await api.get('/usuarios');
      return data;
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateUsuario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Usuario> & { senha?: string }) => {
      const { data } = await api.post('/auth/register', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({ title: 'Usuário cadastrado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao cadastrar usuário', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Usuario> & { id: number; senha?: string }) => {
      const { data } = await api.put(`/usuarios/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({ title: 'Usuário atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar usuário', description: err.message, variant: 'destructive' });
    },
  });
}
