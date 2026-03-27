'use strict';

const db = require('../config/database');
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
  try {
    const { rows } = await db.query(
      `INSERT INTO portaria_visitantes
        (monitor_id, nome, tipo_doc, numero_doc, setor, funcionario, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nome, tipo_doc, numero_doc, setor, funcionario, data_hora, created_at, monitor_id`,
      [
        Number(monitor_id),
        nome.trim(),
        tipo_doc,
        docLimpo,
        setor?.trim() || null,
        funcionario?.trim() || null,
        req.user.empresa_id,
      ]
    );

    const row = rows[0];

    // Buscar nome do monitor para estrutura compatível com frontend
    const monitorResult = await db.query(
      'SELECT id, nome FROM usuarios WHERE id = $1',
      [row.monitor_id]
    );
    row.usuarios = monitorResult.rows[0] ?? null;

    return res.status(201).json(row);
  } catch (error) {
    console.error('[visitante] Erro ao inserir:', error.message);
    return res.status(500).json({ erro: error.message });
  }
}

module.exports = { registrarVisitante };
