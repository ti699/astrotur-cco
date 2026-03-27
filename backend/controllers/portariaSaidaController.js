'use strict';

/**
 * Controller: POST /api/v1/portaria/saida
 *
 * Schema real:
 *   - Entradas estão em portaria_movimentacoes WHERE tipo_movimento = 'ENTRADA'
 *   - portaria_movimentacoes.id       → BIGINT
 *   - portaria_movimentacoes.veiculo_id → INTEGER (FK → veiculos.id)
 *   - veiculos.numero_frota           → representa o "nrOrdem" do veículo
 *   - veiculos.status                 → já existe (DEFAULT 'NA_GARAGEM')
 *   - portaria_movimentacoes.km_entrada → quilometragem registrada na entrada
 *
 * Fluxo:
 *   1. Validar corpo da requisição (validator)
 *   2. Buscar movimentação de ENTRADA pelo entradaId em portaria_movimentacoes (404)
 *   3. Validar que nrOrdem coincide com veiculos.numero_frota da entrada (400)
 *   4. Verificar duplicidade de saída para a mesma entrada (409)
 *   5. Validar kmSaida >= km_entrada (400)
 *   6. Em transação atômica:
 *        a. Inserir registro em portaria_saidas_v1
 *        b. Atualizar veiculos.status → 'EM_OPERACAO'
 *   7. Retornar 201 com o registro completo
 */

const db = require('../config/database');
const { validarSaida } = require('../validators/portariaSaidaValidator');
const veiculoStatus = require('../services/veiculoStatusService');

// -----------------------------------------------------------------------
// Consultas auxiliares (dentro ou fora de transação)
// -----------------------------------------------------------------------

/**
 * Busca a movimentação de ENTRADA pelo id, com JOIN em veiculos
 * para trazer numero_frota (= nrOrdem) e veiculo_id.
 */
async function buscarEntrada(client, entradaId, empresaId) {
  const r = await client.query(
    `SELECT pm.*, v.numero_frota, v.placa, v.id AS veiculo_id_int
     FROM portaria_movimentacoes pm
     LEFT JOIN veiculos v ON v.id = pm.veiculo_id
     WHERE pm.id = $1
       AND pm.empresa_id = $2
       AND pm.tipo_movimento = 'ENTRADA'`,
    [entradaId, empresaId]
  );
  return r.rows.length > 0 ? r.rows[0] : null;
}

/**
 * Verifica se já existe uma saída vinculada à entrada informada.
 */
async function saidaJaExiste(client, entradaId) {
  const check = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'portaria_saidas_v1'`
  );
  if (check.rows.length === 0) return false; // tabela ainda não criada

  const r = await client.query(
    'SELECT id FROM portaria_saidas_v1 WHERE entrada_id = $1',
    [entradaId]
  );
  return r.rows.length > 0;
}

// -----------------------------------------------------------------------
// Handler principal
// -----------------------------------------------------------------------

async function criarSaida(req, res) {
  const {
    entradaId,
    nrOrdem,
    monitor,
    motorista,
    kmSaida,
    destino,
    conforme,
    observacoes,
  } = req.body;

  // ------------------------------------------------------------------
  // ETAPA 1: Validação dos campos obrigatórios
  // ------------------------------------------------------------------
  const { valido, erros } = validarSaida(req.body);
  if (!valido) {
    return res.status(400).json({
      error: true,
      message: 'Campos inválidos na requisição',
      erros,
    });
  }

  // Normalizar valores
  const conformeNorm = String(conforme).trim().toUpperCase(); // 'SIM' | 'NAO'
  const kmSaidaNum   = parseFloat(kmSaida);
  const dataHoraSaida = new Date();

  // Adquirir cliente exclusivo para a transação
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // ----------------------------------------------------------------
    // ETAPA 2: Buscar movimentação de ENTRADA em portaria_movimentacoes
    // ----------------------------------------------------------------
    const entrada = await buscarEntrada(client, entradaId, req.user.empresa_id);

    if (!entrada) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: true,
        message: `Movimentacao de ENTRADA nao encontrada para id: ${entradaId}`,
      });
    }

    // ----------------------------------------------------------------
    // ETAPA 3: Validar nrOrdem contra veiculos.numero_frota da entrada
    // ----------------------------------------------------------------
    const nrOrdemEntrada = entrada.numero_frota ?? null;

    if (nrOrdemEntrada !== null && nrOrdemEntrada !== '') {
      if (String(nrOrdemEntrada).trim() !== String(nrOrdem).trim()) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: true,
          message: `nrOrdem '${nrOrdem}' não corresponde ao número de frota do veículo na entrada ('${nrOrdemEntrada}')`,
        });
      }
    }

    // ----------------------------------------------------------------
    // ETAPA 4: Verificar duplicidade — saída já registrada?
    // ----------------------------------------------------------------
    if (await saidaJaExiste(client, entradaId)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: 'Saída já registrada para esta entrada. Operação duplicada rejeitada.',
      });
    }

    // ----------------------------------------------------------------
    // ETAPA 5: Validar kmSaida >= km_entrada da movimentação
    // ----------------------------------------------------------------
    const kmEntradaNum = entrada.km_entrada != null ? parseFloat(entrada.km_entrada) : null;

    if (kmEntradaNum !== null && kmSaidaNum < kmEntradaNum) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: true,
        message: `kmSaida (${kmSaidaNum}) não pode ser menor que kmEntrada (${kmEntradaNum})`,
      });
    }

    const kmDiferenca = kmEntradaNum !== null ? kmSaidaNum - kmEntradaNum : 0;
    const veiculoId   = entrada.veiculo_id; // INTEGER — FK da portaria_movimentacoes

    // ----------------------------------------------------------------
    // ETAPA 6a: Inserir registro em portaria_saidas_v1
    //           entrada_id é BIGINT (portaria_movimentacoes.id)
    // ----------------------------------------------------------------
    const insertResult = await client.query(
      `INSERT INTO portaria_saidas_v1
         (entrada_id, nr_ordem, data_hora_saida, monitor_id, motorista_id,
          km_saida, km_entrada, km_diferenca, destino, conforme, observacoes, status_veiculo, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        entradaId,
        String(nrOrdem).trim(),
        dataHoraSaida,
        String(monitor).trim(),
        String(motorista).trim(),
        kmSaidaNum,
        kmEntradaNum ?? kmSaidaNum,
        kmDiferenca,
        String(destino).trim(),
        conformeNorm,
        observacoes?.trim() || null,
        'EM_OPERACAO',
        req.user.empresa_id,
      ]
    );

    const saidaRow = insertResult.rows[0];

    // ----------------------------------------------------------------
    // ETAPA 6b: Atualizar veiculos.status → 'EM_OPERACAO'
    //           veiculos.status já existe no schema (DEFAULT 'NA_GARAGEM')
    //           best-effort: avisa no log se falhar, mas não reverte
    // ----------------------------------------------------------------
    if (veiculoId) {
      try {
        await veiculoStatus.onSaidaPortaria(veiculoId);
      } catch (veiculoErr) {
        console.warn('[portariaSaida] Aviso: não foi possível atualizar status do veículo:', veiculoErr.message);
      }
    }

    // ----------------------------------------------------------------
    // ETAPA 7: Commit e resposta 201
    // ----------------------------------------------------------------
    await client.query('COMMIT');

    return res.status(201).json({
      id:            saidaRow.id,
      entradaId:     Number(entradaId),
      nrOrdem:       String(nrOrdem).trim(),
      motorista:     String(motorista).trim(),
      monitor:       String(monitor).trim(),
      kmEntrada:     kmEntradaNum ?? null,
      kmSaida:       kmSaidaNum,
      kmDiferenca,
      destino:       String(destino).trim(),
      conforme:      conformeNorm,
      dataHoraSaida: dataHoraSaida.toISOString(),
      statusVeiculo: 'EM_OPERACAO',
    });

  } catch (err) {
    // Em caso de qualquer erro inesperado, reverter tudo
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[portariaSaida] Erro na transação:', err);
    return res.status(500).json({
      error: true,
      message: 'Erro interno ao registrar saída',
      detalhe: err.message,
    });
  } finally {
    client.release();
  }
}

module.exports = { criarSaida };
