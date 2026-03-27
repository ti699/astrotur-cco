/**
 * socorroController.js
 *
 * Controller para POST /api/v1/socorro
 * Fluxo:
 *   1. Valida body
 *   2. Gera código ASTRO.TRF.XXX-D
 *   3. Persiste no PostgreSQL (tabela chamados_socorro)
 *   4. Retorna 201 com o registro completo
 *
 * Migrado de Supabase → pg Pool nativo em 2026-03-23
 */

'use strict';

const db                     = require('../config/database');
const { validarSocorro }    = require('../validators/socorroValidator');
const { gerarCodigoSocorro } = require('../services/codigoSocorroService');

/**
 * POST /api/v1/socorro
 */
async function criarSocorro(req, res) {
  // ── 1. Validação ─────────────────────────────────────────────────────────
  const validacao = validarSocorro(req.body);

  if (!validacao.valido) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      campos: validacao.erros,
    });
  }

  const {
    titulo,
    descricao,
    solicitante,
    setor,
    prioridade,
    categoria = null,
    anexos    = [],
  } = req.body;

  try {
    // ── 2. Gerar código de socorro ──────────────────────────────────────────
    // Prioridade normalizada para uppercase (aceita 'alta' ou 'ALTA')
    const prioridadeNorm = String(prioridade).toUpperCase();

    const codigoSocorro = await gerarCodigoSocorro();

    // ── 3. Persistir no PostgreSQL ──────────────────────────────────────────
    const { rows } = await db.query(
      `INSERT INTO chamados_socorro
        (codigo_socorro, titulo, descricao, solicitante, setor, prioridade, categoria, anexos, status, data_criacao, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ABERTO', $9, $10)
       RETURNING
         id, codigo_socorro, titulo, descricao, solicitante, setor,
         prioridade, categoria, anexos, status, data_criacao`,
      [
        codigoSocorro,
        String(titulo).trim(),
        String(descricao).trim(),
        String(solicitante).trim(),
        String(setor).trim(),
        prioridadeNorm,
        categoria ? String(categoria).trim() : null,
        JSON.stringify(Array.isArray(anexos) ? anexos : []),
        new Date().toISOString(),
        req.user.empresa_id,
      ]
    );

    const data = rows[0];

    if (!data) {
      return res.status(500).json({ erro: 'Falha ao persistir chamado de socorro' });
    }

    console.log(`✅ Chamado de socorro criado: ${data.codigo_socorro}`);

    // ── 4. Resposta 201 ─────────────────────────────────────────────────────
    return res.status(201).json({
      codigoSocorro: data.codigo_socorro,
      titulo:        data.titulo,
      status:        data.status,
      prioridade:    data.prioridade,
      solicitante:   data.solicitante,
      setor:         data.setor,
      categoria:     data.categoria,
      anexos:        data.anexos,
      dataCriacao:   data.data_criacao,
    });

  } catch (err) {
    console.error('❌ Erro inesperado em criarSocorro:', err);
    return res.status(500).json({ erro: 'Erro interno ao processar o chamado de socorro' });
  }
}

module.exports = { criarSocorro };
