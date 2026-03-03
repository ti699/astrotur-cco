/**
 * Hooks TanStack Query para integração com o backend.
 * Quando o backend está indisponível (modo demo / Vercel sem servidor),
 * os hooks retornam dados mockados e as mutações atualizam o cache local.
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

const MOCK_DASHBOARD: DashboardResumo = {
  stats: {
    totalOcorrencias: 47, atrasos: 8, veiculosAtribuidos: 38,
    tempoMedioAtendimento: "00:42", ocorrenciasHoje: 5,
    comparacaoMesAnterior: 12, comparacaoAtrasos: -3,
  },
  veiculosPorTipo: [
    { tipo: "Ônibus", total: 28 }, { tipo: "Van", total: 10 }, { tipo: "Micro", total: 6 },
  ],
};

const MOCK_OCORRENCIAS: Ocorrencia[] = [
  { id: 1, numero_ocorrencia: "OC-001", cliente_nome: "JEEP", monitor_nome: "VALDOMIRO", data_ocorrencia: "2026-03-03T08:30:00", tipo_ocorrencia: "QUEBRA", veiculo_placa: "AAA-1234", houve_atraso: "sim", tempo_atraso: "00:30", status: "PENDENTE", descricao: "Pane elétrica no veículo 122420" },
  { id: 2, numero_ocorrencia: "OC-002", cliente_nome: "VILA GALÉ", monitor_nome: "ANDERSON", data_ocorrencia: "2026-03-03T09:15:00", tipo_ocorrencia: "PANE_ELETRICA", veiculo_placa: "BBB-5678", houve_atraso: "nao", status: "EM_ANDAMENTO", descricao: "Falha no alternador" },
  { id: 3, numero_ocorrencia: "OC-003", cliente_nome: "HDH", monitor_nome: "MACARIO", data_ocorrencia: "2026-03-02T14:00:00", tipo_ocorrencia: "ACIDENTE", veiculo_placa: "CCC-9012", houve_atraso: "sim", tempo_atraso: "01:00", status: "CONCLUIDO", descricao: "Colisão leve na Av. Norte" },
  { id: 4, numero_ocorrencia: "OC-004", cliente_nome: "JEEP", monitor_nome: "IRANILDO", data_ocorrencia: "2026-03-02T11:20:00", tipo_ocorrencia: "PNEU_FURADO", veiculo_placa: "DDD-3456", houve_atraso: "nao", status: "CONCLUIDO", descricao: "Troca de pneu traseiro" },
  { id: 5, numero_ocorrencia: "OC-005", cliente_nome: "CBA", monitor_nome: "VALDOMIRO", data_ocorrencia: "2026-03-01T07:45:00", tipo_ocorrencia: "OUTROS", veiculo_placa: "EEE-7890", houve_atraso: "sim", tempo_atraso: "00:15", status: "PENDENTE", descricao: "Motorista atrasado no ponto" },
];

const MOCK_VEICULOS: Veiculo[] = [
  { id: 1, placa: "AAA-1234", numero_frota: "122420", modelo: "OF 1722", marca: "Mercedes", tipo: "Ônibus", ano: 2020, cliente_nome: "JEEP", km_atual: 196853, status: "EM_OPERACAO", localizacao: "Paulista" },
  { id: 2, placa: "BBB-5678", numero_frota: "121902", modelo: "OF 1418", marca: "Mercedes", tipo: "Ônibus", ano: 2019, cliente_nome: "VILA GALÉ", km_atual: 752956, status: "NA_GARAGEM", localizacao: "Garagem Central" },
  { id: 3, placa: "CCC-9012", numero_frota: "2536", modelo: "Sprinter", marca: "Mercedes", tipo: "Van", ano: 2021, cliente_nome: "HDH", km_atual: 89230, status: "EM_MANUTENCAO", localizacao: "Oficina Central" },
  { id: 4, placa: "DDD-3456", numero_frota: "102104", modelo: "OF 1722", marca: "Mercedes", tipo: "Ônibus", ano: 2018, cliente_nome: "CBA", km_atual: 312450, status: "EM_OPERACAO", localizacao: "Barro" },
  { id: 5, placa: "EEE-7890", numero_frota: "101318", modelo: "Daily", marca: "Iveco", tipo: "Micro", ano: 2022, cliente_nome: "JEEP", km_atual: 45000, status: "NA_GARAGEM", localizacao: "Garagem Sul" },
];

const MOCK_CLIENTES: Cliente[] = [
  { id: 1, nome: "JEEP", cnpj: "12.345.678/0001-90", contato: "Carlos Silva", email: "carlos@jeep.com.br", sla_horas: 2, sla_nivel: "ALTO", sla_requisitos: "Ar-condicionado obrigatório. Veículo máx. 3 anos.", ativo: true },
  { id: 2, nome: "VILA GALÉ", cnpj: "23.456.789/0001-01", contato: "Maria Santos", email: "maria@vilagale.com.br", sla_horas: 3, sla_nivel: "ALTO", sla_requisitos: "Ar-condicionado obrigatório. Bancos reclináveis.", ativo: true },
  { id: 3, nome: "HDH", cnpj: "34.567.890/0001-12", contato: "João Pereira", email: "joao@hdh.com.br", sla_horas: 2, sla_nivel: "MÉDIO", sla_requisitos: "Veículo em bom estado. Pontualidade rigorosa.", ativo: true },
  { id: 4, nome: "CBA", cnpj: "45.678.901/0001-23", contato: "Ana Costa", email: "ana@cba.com.br", sla_horas: 4, sla_nivel: "MÉDIO", sla_requisitos: "Nenhum requisito especial.", ativo: true },
  { id: 5, nome: "CAMPARI", cnpj: "56.789.012/0001-34", contato: "Pedro Lima", email: "pedro@campari.com.br", sla_horas: 2, sla_nivel: "BAIXO", sla_requisitos: "", ativo: true },
];

const MOCK_USUARIOS: Usuario[] = [
  { id: 1, nome: "Administrador", email: "admin@sistemacco.com", perfil: "administrador", cargo: "Gestor", ativo: true },
  { id: 2, nome: "Monitor CCO", email: "monitor@sistemacco.com", perfil: "editor", cargo: "Monitor", ativo: true },
  { id: 3, nome: "Portaria", email: "portaria@sistemacco.com", perfil: "portaria", cargo: "Porteiro", ativo: true },
];

/** Tenta chamar a API; em caso de falha retorna dados de fallback. */
async function tryApi<T>(apiFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await apiFn();
  } catch {
    return fallback;
  }
}

export function useDashboard() {
  return useQuery<DashboardResumo>({
    queryKey: ['dashboard'],
    queryFn: () => tryApi(async () => {
      const { data } = await api.get('/dashboard/resumo');
      return data;
    }, MOCK_DASHBOARD),
    staleTime: 1000 * 30,
    retry: 1,
  });
}

// ─── Ocorrências ──────────────────────────────────────────────────────────────

export function useOcorrencias() {
  return useQuery<Ocorrencia[]>({
    queryKey: ['ocorrencias'],
    queryFn: () => tryApi(async () => {
      const { data } = await api.get('/ocorrencias');
      return data;
    }, MOCK_OCORRENCIAS),
    staleTime: 1000 * 20,
    retry: 1,
  });
}

export function useCreateOcorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      try {
        const { data } = await api.post('/ocorrencias', payload);
        return data;
      } catch {
        return { id: Date.now(), ...payload };
      }
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<Ocorrencia[]>(['ocorrencias'], (old = []) => [
        { ...newItem, id: newItem.id ?? Date.now() } as Ocorrencia, ...old,
      ]);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Ocorrência registrada!', description: 'Salva com sucesso.' });
    },
  });
}

export function useUpdateOcorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown>) => {
      try {
        const { data } = await api.put(`/ocorrencias/${id}`, payload);
        return data;
      } catch {
        return { id, ...payload };
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Ocorrencia[]>(['ocorrencias'], (old = []) =>
        old.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      );
      toast({ title: 'Ocorrência atualizada!' });
    },
  });
}

export function useDeleteOcorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      try { await api.delete(`/ocorrencias/${id}`); } catch { /* offline */ }
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Ocorrencia[]>(['ocorrencias'], (old = []) =>
        old.filter((o) => o.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Ocorrência excluída.' });
    },
  });
}

// ─── Veículos ─────────────────────────────────────────────────────────────────

export function useVeiculos() {
  return useQuery<Veiculo[]>({
    queryKey: ['veiculos'],
    queryFn: () => tryApi(async () => {
      const { data } = await api.get('/veiculos');
      return data;
    }, MOCK_VEICULOS),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useCreateVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Veiculo>) => {
      try {
        const { data } = await api.post('/veiculos', payload);
        return data;
      } catch {
        return { id: Date.now(), ...payload };
      }
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) => [{ ...novo } as Veiculo, ...old]);
      toast({ title: 'Veículo cadastrado!' });
    },
  });
}

export function useUpdateVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Veiculo> & { id: number }) => {
      try {
        const { data } = await api.put(`/veiculos/${id}`, payload);
        return data;
      } catch {
        return { id, ...payload };
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) =>
        old.map((v) => (v.id === updated.id ? { ...v, ...updated } : v))
      );
      toast({ title: 'Veículo atualizado!' });
    },
  });
}

export function useDeleteVeiculo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      try { await api.delete(`/veiculos/${id}`); } catch { /* offline */ }
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) =>
        old.filter((v) => v.id !== id)
      );
      toast({ title: 'Veículo excluído.' });
    },
  });
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => tryApi(async () => {
      const { data } = await api.get('/clientes');
      return data;
    }, MOCK_CLIENTES),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Cliente>) => {
      try {
        const { data } = await api.post('/clientes', payload);
        return data;
      } catch {
        return { id: Date.now(), ...payload, ativo: true };
      }
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Cliente[]>(['clientes'], (old = []) => [{ ...novo } as Cliente, ...old]);
      toast({ title: 'Cliente cadastrado!' });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Cliente> & { id: number }) => {
      try {
        const { data } = await api.put(`/clientes/${id}`, payload);
        return data;
      } catch {
        return { id, ...payload };
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Cliente[]>(['clientes'], (old = []) =>
        old.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
      toast({ title: 'Cliente atualizado!' });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      try { await api.delete(`/clientes/${id}`); } catch { /* offline */ }
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Cliente[]>(['clientes'], (old = []) =>
        old.filter((c) => c.id !== id)
      );
      toast({ title: 'Cliente excluído.' });
    },
  });
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

export function useUsuarios() {
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => tryApi(async () => {
      const { data } = await api.get('/usuarios');
      return data;
    }, MOCK_USUARIOS),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useCreateUsuario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<Usuario> & { senha?: string }) => {
      try {
        const { data } = await api.post('/auth/register', payload);
        return data;
      } catch {
        return { id: Date.now(), ...payload, ativo: true };
      }
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Usuario[]>(['usuarios'], (old = []) => [{ ...novo } as Usuario, ...old]);
      toast({ title: 'Usuário cadastrado!' });
    },
  });
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Usuario> & { id: number; senha?: string }) => {
      try {
        const { data } = await api.put(`/usuarios/${id}`, payload);
        return data;
      } catch {
        return { id, ...payload };
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Usuario[]>(['usuarios'], (old = []) =>
        old.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
      );
      toast({ title: 'Usuário atualizado!' });
    },
  });
}
