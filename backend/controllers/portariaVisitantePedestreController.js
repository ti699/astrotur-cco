'use strict';

const { supabase } = require('../config/supabase');
const { validarVisitante } = require('../validators/visitanteValidator');

/**
 * POST /api/portaria/visitante
 *
 * Registra entrada de visitante pedestre em portaria_visitantes.
 * Documento salvo normalizado (sem pontos e traços).
 */
async function registrarVisitante(req, res) {
  // 1. Validar
  const validacao = validarVisitante(req.body);
  if (!validacao.valido) {
    return res.status(422).json({
      erro: validacao.mensagem,
      campos: validacao.campos,
    });
  }

  const { monitor_id, nome, tipo_doc, numero_doc, setor, funcionario } = req.body;

  // 2. Normalizar documento — remover pontuação antes de salvar
  const docLimpo = numero_doc.replace(/[.\-]/g, '').trim().toUpperCase();

  // 3. Inserir no banco
  const { data, error } = await supabase
    .from('portaria_visitantes')
    .insert({
      monitor_id:  Number(monitor_id),
      nome:        nome.trim(),
      tipo_doc,
      numero_doc:  docLimpo,
      setor:       setor?.trim()       || null,
      funcionario: funcionario?.trim() || null,
    })
    .select(`
      id,
      nome,
      tipo_doc,
      numero_doc,
      setor,
      funcionario,
      data_hora,
      created_at,
      usuarios!monitor_id ( id, nome )
    `)
    .single();

  if (error) {
    console.error('[visitante] Erro ao inserir:', error.message);
    return res.status(500).json({ erro: error.message });
  }

  return res.status(201).json(data);
}

module.exports = { registrarVisitante };
