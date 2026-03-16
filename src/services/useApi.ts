/**
 * Hooks TanStack Query â€” integraÃ§Ã£o direta com Supabase.
 * Funciona em produÃ§Ã£o (Vercel) sem precisar de backend Express.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Gera nÃºmero de ocorrÃªncia no formato DD/MM-NNNN */
function gerarNumero(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `${dd}/${mm}-${n}`;
}

/** Extrai campo do JSONB observacoes */
function obs(row: Record<string, unknown>, key: string): string {
  try {
    const o = typeof row.observacoes === 'string'
      ? JSON.parse(row.observacoes)
      : (row.observacoes ?? {});
    return (o as Record<string, string>)[key] ?? '';
  } catch {
    return '';
  }
}

/** Mapeia row do banco para o tipo Ocorrencia do frontend */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOcorrencia(row: any): Ocorrencia {
  const c = row.clientes;
  const v = row.veiculos;
  const tq = row.tipos_quebra;
  // Converter atraso_minutos de volta para HH:MM
  const atrasoMin: number = row.atraso_minutos ?? 0;
  const tempoAtrasoFormatado = atrasoMin > 0
    ? `${String(Math.floor(atrasoMin / 60)).padStart(2, '0')}:${String(atrasoMin % 60).padStart(2, '0')}`
    : '';
  return {
    id: row.id,
    numero_ocorrencia: row.numero,
    numero: row.numero,
    cliente_nome: c?.nome ?? obs(row, 'cliente_nome'),
    monitor_nome: row.plantonista ?? obs(row, 'monitor_nome'),
    data_ocorrencia: row.data_quebra,
    data_quebra: row.data_quebra,
    tipo_ocorrencia: row.tipo_ocorrencia ?? tq?.nome ?? obs(row, 'tipo_ocorrencia'),
    tipo_quebra_nome: tq?.nome,
    tipo_socorro: row.tipo_socorro ?? null,
    descricao_socorro: row.descricao_socorro ?? null,
    veiculo_placa: v?.placa ?? obs(row, 'veiculo_placa'),
    houve_troca_veiculo: row.houve_troca_veiculo ?? false,
    veiculo_substituto_placa: obs(row, 'veiculo_substituto_placa'),
    horario_socorro: row.horario_socorro ?? obs(row, 'horario_socorro'),
    horario_saida: row.horario_saida_socorro ?? obs(row, 'horario_saida'),
    houve_atraso: row.houve_atraso ?? false,
    tempo_atraso: tempoAtrasoFormatado,
    descricao: row.descricao,
    status: row.status,
    created_at: row.created_at,
  };
}

// â”€â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useDashboard() {
  return useQuery<DashboardResumo>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [{ count: total }, { count: veiculos }, { count: hoje }] = await Promise.all([
        supabase.from('ocorrencias').select('*', { count: 'exact', head: true }),
        supabase.from('veiculos').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('ocorrencias').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0]),
      ]);

      return {
        stats: {
          totalOcorrencias: total ?? 0,
          atrasos: 0,
          veiculosAtribuidos: veiculos ?? 0,
          tempoMedioAtendimento: '00:42',
          ocorrenciasHoje: hoje ?? 0,
          comparacaoMesAnterior: 0,
          comparacaoAtrasos: 0,
        },
        veiculosPorTipo: [],
      };
    },
    staleTime: 1000 * 30,
    retry: 2,
  });
}

// â”€â”€â”€ OcorrÃªncias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useOcorrencias() {
  return useQuery<Ocorrencia[]>({
    queryKey: ['ocorrencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ocorrencias')
        .select('*, clientes(nome), veiculos(placa, modelo), tipos_quebra(nome)')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => mapOcorrencia(r));
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
      // ── 1. Resolver veiculo_id pelo campo "veiculo_previsto" (placa) ──────────
      let veiculo_id: number | null = null;
      if (payload.veiculo_previsto) {
        const { data: v } = await supabase
          .from('veiculos').select('id').eq('placa', payload.veiculo_previsto).maybeSingle();
        veiculo_id = v?.id ?? null;
      }

      // ── 2. Resolver veiculo_substituto_id ─────────────────────────────────────
      let veiculo_substituto_id: number | null = null;
      if (payload.veiculo_substituto) {
        const { data: vs } = await supabase
          .from('veiculos').select('id').eq('placa', payload.veiculo_substituto).maybeSingle();
        veiculo_substituto_id = vs?.id ?? null;
      }

      // ── 3. Resolver cliente_id pelo nome ─────────────────────────────────────
      let cliente_id: number | null = null;
      if (payload.cliente) {
        const { data: c } = await supabase
          .from('clientes').select('id').eq('nome', payload.cliente).maybeSingle();
        cliente_id = c?.id ?? null;
      }

      // ── 4. Combinar data + hora → timestamp ───────────────────────────────────
      const data_quebra = payload.hora
        ? `${payload.data}T${payload.hora}:00`
        : `${payload.data}T00:00:00`;

      // ── 5. Converter tempo_atraso "HH:MM" → inteiro em minutos ───────────────
      const { horaParaMinutos } = await import('@/schemas/ocorrenciaSchema');
      const atraso_minutos = payload.houve_atraso
        ? horaParaMinutos(payload.tempo_atraso ?? '')
        : 0;

      // ── 6. Montar payload de insert com colunas reais ─────────────────────────
      const { data, error } = await supabase
        .from('ocorrencias')
        .insert({
          numero: gerarNumero(),
          // FKs resolvidas
          cliente_id,
          veiculo_id,
          veiculo_substituto_id,
          // Dados estruturados — sem JSONB
          plantonista: payload.plantonista,
          tipo_ocorrencia: payload.tipo_ocorrencia,
          tipo_socorro: payload.tipo_ocorrencia === 'Socorro' ? (payload.tipo_socorro ?? null) : null,
          descricao_socorro: payload.tipo_ocorrencia === 'Socorro' ? (payload.descricao_socorro ?? null) : null,
          houve_troca_veiculo: Boolean(payload.veiculo_substituto),
          horario_socorro: payload.tipo_ocorrencia === 'Socorro' ? (payload.horario_socorro || null) : null,
          horario_saida_socorro: payload.tipo_ocorrencia === 'Socorro' ? (payload.horario_saida || null) : null,
          houve_atraso: payload.houve_atraso,
          atraso_minutos,
          // Tronco existente
          data_quebra,
          data_chamado: new Date().toISOString(),
          descricao: payload.descricao,
          status: payload.status,
        })
        .select('*, clientes(nome), veiculos(placa), tipos_quebra(nome)')
        .single();

      if (error) throw new Error(error.message);
      return mapOcorrencia(data);
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
      const { data, error } = await supabase
        .from('ocorrencias')
        .update({ descricao: payload.descricao, status: payload.status })
        .eq('id', id as number)
        .select('*, clientes(nome), veiculos(placa), tipos_quebra(nome)')
        .single();

      if (error) throw new Error(error.message);
      return mapOcorrencia(data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Ocorrencia[]>(['ocorrencias'], (old = []) =>
        old.map((o) => (o.id === updated.id ? updated : o))
      );
      toast({ title: 'OcorrÃªncia atualizada!' });
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
      const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Ocorrencia[]>(['ocorrencias'], (old = []) =>
        old.filter((o) => o.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'OcorrÃªncia excluÃ­da.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    },
  });
}

// â”€â”€â”€ VeÃ­culos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useVeiculos() {
  return useQuery<Veiculo[]>({
    queryKey: ['veiculos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*, clientes(nome)')
        .eq('ativo', true)
        .order('placa');

      if (error) throw new Error(error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((v: any) => ({
        ...v,
        cliente_nome: v.clientes?.nome ?? '',
      })) as Veiculo[];
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
      const { cliente_nome, ...rest } = payload;
      // Resolver cliente_id se veio nome
      let cliente_id = rest.cliente_id;
      if (!cliente_id && cliente_nome) {
        const { data: c } = await supabase.from('clientes').select('id').eq('nome', cliente_nome).maybeSingle();
        cliente_id = c?.id;
      }
      const { data, error } = await supabase
        .from('veiculos').insert({ ...rest, cliente_id, ativo: true })
        .select('*, clientes(nome)').single();

      if (error) throw new Error(error.message);
      return { ...data, cliente_nome: data.clientes?.nome ?? '' } as Veiculo;
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) => [novo, ...old]);
      toast({ title: 'VeÃ­culo cadastrado!' });
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
    mutationFn: async ({ id, cliente_nome, ...payload }: Partial<Veiculo> & { id: number }) => {
      let cliente_id = payload.cliente_id;
      if (!cliente_id && cliente_nome) {
        const { data: c } = await supabase.from('clientes').select('id').eq('nome', cliente_nome).maybeSingle();
        cliente_id = c?.id;
      }
      const { data, error } = await supabase
        .from('veiculos').update({ ...payload, cliente_id })
        .eq('id', id).select('*, clientes(nome)').single();

      if (error) throw new Error(error.message);
      return { ...data, cliente_nome: data.clientes?.nome ?? '' } as Veiculo;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) =>
        old.map((v) => (v.id === updated.id ? updated : v))
      );
      toast({ title: 'VeÃ­culo atualizado!' });
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
      // Soft delete
      const { error } = await supabase.from('veiculos').update({ ativo: false }).eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Veiculo[]>(['veiculos'], (old = []) => old.filter((v) => v.id !== id));
      toast({ title: 'VeÃ­culo excluÃ­do.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    },
  });
}

// â”€â”€â”€ Clientes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes').select('*').order('nome');

      if (error) throw new Error(error.message);
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
      const { data, error } = await supabase
        .from('clientes').insert({ ...payload, ativo: true }).select().single();
      if (error) throw new Error(error.message);
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
      const { data, error } = await supabase
        .from('clientes').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
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
      const { error } = await supabase.from('clientes').update({ ativo: false }).eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Cliente[]>(['clientes'], (old = []) => old.filter((c) => c.id !== id));
      toast({ title: 'Cliente excluÃ­do.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    },
  });
}

// â”€â”€â”€ UsuÃ¡rios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useUsuarios() {
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios').select('id, nome, email, perfil, cargo, ativo').order('nome');
      if (error) throw new Error(error.message);
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
      // Usa RPC criar_usuario para hashear a senha com bcrypt (pgcrypto) no servidor
      const { data, error } = await supabase.rpc('criar_usuario', {
        p_nome:   payload.nome,
        p_email:  payload.email,
        p_senha:  payload.senha || 'mudar@123',
        p_cargo:  payload.cargo  || null,
        p_perfil: payload.perfil || 'portaria',
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || 'Erro ao criar usuario');
      return { id: data.id, nome: data.nome, email: data.email, perfil: data.perfil, cargo: data.cargo, ativo: true } as Usuario;
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Usuario[]>(['usuarios'], (old = []) => [novo, ...old]);
      toast({ title: 'Usuario cadastrado!', description: 'Senha definida conforme informado.' });
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
      const { data, error } = await supabase
        .from('usuarios')
        .update({ nome: payload.nome, email: payload.email, cargo: payload.cargo, perfil: payload.perfil, ativo: payload.ativo })
        .eq('id', id)
        .select('id, nome, email, perfil, cargo, ativo')
        .single();

      if (error) throw new Error(error.message);
      return data as Usuario;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Usuario[]>(['usuarios'], (old = []) =>
        old.map((u) => (u.id === updated.id ? updated : u))
      );
      toast({ title: 'UsuÃ¡rio atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });
}
