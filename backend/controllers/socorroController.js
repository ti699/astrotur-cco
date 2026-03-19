/**
 * socorroController.js
 *
 * Controller para POST /api/v1/socorro
 * Fluxo:
 *   1. Valida body
 *   2. Gera código ASTRO.TRF.XXX-D
 *   3. Persiste no Supabase (tabela chamados_socorro)
 *   4. Retorna 201 com o registro completo
 */

'use strict';

const { supabase }          = require('../config/supabase');
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

    // ── 3. Persistir no Supabase ────────────────────────────────────────────
    const { data, error } = await supabase
      .from('chamados_socorro')
      .insert({
        codigo_socorro: codigoSocorro,
        titulo:         String(titulo).trim(),
        descricao:      String(descricao).trim(),
        solicitante:    String(solicitante).trim(),
        setor:          String(setor).trim(),
        prioridade:     prioridadeNorm,
        categoria:      categoria ? String(categoria).trim() : null,
        anexos:         Array.isArray(anexos) ? anexos : [],
        status:         'ABERTO',
        data_criacao:   new Date().toISOString(),
      })
      .select(`
        id,
        codigo_socorro,
        titulo,
        descricao,
        solicitante,
        setor,
        prioridade,
        categoria,
        anexos,
        status,
        data_criacao
      `)
      .single();

    if (error) {
      console.error('❌ Supabase erro ao criar chamado de socorro:', error);
      return res.status(500).json({ erro: error.message });
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
