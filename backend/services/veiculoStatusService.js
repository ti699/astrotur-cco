'use strict';

/**
 * Serviço centralizado de status de veículo.
 *
 * REGRAS DE NEGÓCIO:
 *   Entrada portaria   → NA_GARAGEM
 *   Saída portaria     → EM_OPERACAO  (salvo se houver manutenção ativa)
 *   Manutenção criada  → EM_MANUTENCAO (prioridade máxima)
 *   Manutenção concluída → NA_GARAGEM (se não houver outra manutenção ativa)
 *
 * Todo controller que afeta status deve chamar este serviço.
 * Nunca atualizar veiculos.status diretamente.
 */

const { supabase } = require('../config/supabase');

const STATUS = {
  NA_GARAGEM:    'NA_GARAGEM',
  EM_OPERACAO:   'EM_OPERACAO',
  EM_MANUTENCAO: 'EM_MANUTENCAO',
};

// ─── Primitiva de atualização ────────────────────────────────────────────────

async function atualizarStatus(veiculo_id, novoStatus) {
  const { error } = await supabase
    .from('veiculos')
    .update({ status: novoStatus })
    .eq('id', veiculo_id);

  if (error) {
    console.error(`[veiculoStatus] Erro ao atualizar veiculo ${veiculo_id}:`, error.message);
    throw new Error(error.message);
  }

  console.log(`[veiculoStatus] Veiculo ${veiculo_id} → ${novoStatus}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function temManutencaoAtiva(veiculo_id) {
  const { data } = await supabase
    .from('manutencoes')
    .select('id')
    .eq('veiculo_id', veiculo_id)
    .in('status', ['PENDENTE', 'EM_ANDAMENTO', 'ABERTA'])
    .limit(1)
    .maybeSingle();
  return !!data;
}

// ─── Handlers de evento ──────────────────────────────────────────────────────

/**
 * Chamado quando uma ENTRADA é registrada na portaria.
 * Regra: veículo chegou → NA_GARAGEM.
 */
async function onEntradaPortaria(veiculo_id) {
  await atualizarStatus(veiculo_id, STATUS.NA_GARAGEM);
}

/**
 * Chamado quando uma SAÍDA é registrada na portaria.
 * Regra: veículo saiu → EM_OPERACAO, a menos que haja manutenção ativa.
 */
async function onSaidaPortaria(veiculo_id) {
  if (await temManutencaoAtiva(veiculo_id)) {
    console.log(`[veiculoStatus] Veiculo ${veiculo_id} tem manutenção ativa — status não alterado`);
    return;
  }
  await atualizarStatus(veiculo_id, STATUS.EM_OPERACAO);
}

/**
 * Chamado quando uma manutenção é CRIADA para o veículo.
 * Regra: manutenção aberta = EM_MANUTENCAO (prioridade máxima).
 */
async function onManutencaoCriada(veiculo_id) {
  await atualizarStatus(veiculo_id, STATUS.EM_MANUTENCAO);
}

/**
 * Chamado quando uma manutenção é CONCLUÍDA.
 * Se ainda houver outra manutenção ativa, mantém EM_MANUTENCAO.
 * Caso contrário, retorna para NA_GARAGEM.
 */
async function onManutencaoConcluida(veiculo_id) {
  if (await temManutencaoAtiva(veiculo_id)) {
    console.log(`[veiculoStatus] Veiculo ${veiculo_id} ainda tem outra manutenção ativa`);
    return;
  }
  await atualizarStatus(veiculo_id, STATUS.NA_GARAGEM);
}

// ─── Recálculo completo ───────────────────────────────────────────────────────

/**
 * Recalcula o status de um veículo do zero baseado no estado real do banco.
 * Ordem de prioridade: EM_MANUTENCAO > EM_OPERACAO > NA_GARAGEM.
 * Útil para corrigir inconsistências ou sincronizar registros antigos.
 */
async function recalcularStatus(veiculo_id) {
  // 1. Manutenção ativa tem prioridade máxima
  if (await temManutencaoAtiva(veiculo_id)) {
    await atualizarStatus(veiculo_id, STATUS.EM_MANUTENCAO);
    return STATUS.EM_MANUTENCAO;
  }

  // 2. Verificar última movimentação de portaria
  const { data: ultima } = await supabase
    .from('portaria_movimentacoes')
    .select('tipo_movimento, tipo_movimentacao, movimento, tipo')
    .eq('veiculo_id', veiculo_id)
    .order('data_hora', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Normaliza o campo independente do nome real da coluna
  const tipoUltimo = ultima
    ? (ultima.tipo_movimento || ultima.tipo_movimentacao || ultima.movimento || ultima.tipo || '').toUpperCase()
    : '';

  if (tipoUltimo === 'SAIDA') {
    await atualizarStatus(veiculo_id, STATUS.EM_OPERACAO);
    return STATUS.EM_OPERACAO;
  }

  // Sem movimentação ou última foi ENTRADA → NA_GARAGEM
  await atualizarStatus(veiculo_id, STATUS.NA_GARAGEM);
  return STATUS.NA_GARAGEM;
}

module.exports = {
  onEntradaPortaria,
  onSaidaPortaria,
  onManutencaoCriada,
  onManutencaoConcluida,
  recalcularStatus,
  STATUS,
};
