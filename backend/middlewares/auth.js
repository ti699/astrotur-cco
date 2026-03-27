'use strict';

/**
 * middlewares/auth.js
 *
 * Middleware de autenticação JWT com contexto de tenant (empresa_id).
 *
 * Fluxo:
 *   1. Extrai o token Bearer do header Authorization
 *   2. Verifica assinatura e expiração do JWT
 *   3. Busca o usuário no banco (garante que está ativo e ainda existe)
 *   4. Verifica que a empresa do usuário está ativa
 *   5. Popula req.user com id, nome, email, perfil, empresa_id e empresa
 *
 * SEGURANÇA:
 *   - O empresa_id NUNCA é lido do corpo da requisição nem da query string.
 *   - O empresa_id é sempre derivado do usuário autenticado no banco.
 *   - Isso impede que um client mal-intencionado troque de tenant via payload.
 *
 * Exports:
 *   authenticateToken   — middleware obrigatório (401 se ausente/inválido)
 *   authenticateOptional — middleware opcional (req.user = null se sem token)
 *   requireRole(...roles) — factory de middleware para verificar perfis
 */

const jwt = require('jsonwebtoken');
const db  = require('../config/database');

/**
 * Perfis reconhecidos (do mais alto para o mais baixo privilégio).
 * Usados por requireRole() para verificação de autorização.
 */
const PERFIS_VALIDOS = [
  'administrador',
  'gerente',
  'editor',
  'monitor',
  'operador',
  'plantonista',
  'portaria',
];

/**
 * Middleware principal — exige token JWT válido.
 * Popula req.user = { id, nome, email, perfil, empresa_id, empresa }
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido' });
  }

  try {
    // 1. Verificar assinatura e expiração
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_dev_key_32chars_ok'
    );

    // 2. Carregar usuário e empresa do banco em uma única query
    //    Garante que o usuário ainda existe, está ativo e que a empresa está ativa.
    const { rows } = await db.query(
      `SELECT
         u.id,
         u.nome,
         u.email,
         u.perfil,
         u.ativo          AS usuario_ativo,
         u.empresa_id,
         e.id             AS empresa_id_check,
         e.nome           AS empresa_nome,
         e.slug           AS empresa_slug,
         e.plano          AS empresa_plano,
         e.ativo          AS empresa_ativa
       FROM usuarios u
       INNER JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const user = rows[0];

    // 3. Verificar se usuário está ativo
    if (!user.usuario_ativo) {
      return res.status(401).json({ message: 'Usuário inativo' });
    }

    // 4. Verificar se a empresa está ativa
    if (!user.empresa_ativa) {
      return res.status(403).json({ message: 'Empresa inativa ou suspensa' });
    }

    // 5. Popula req.user — fonte de verdade para toda a request
    req.user = {
      id:         user.id,
      nome:       user.nome,
      email:      user.email,
      perfil:     user.perfil,
      empresa_id: user.empresa_id,
      empresa: {
        id:    user.empresa_id,
        nome:  user.empresa_nome,
        slug:  user.empresa_slug,
        plano: user.empresa_plano,
      },
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado — faça login novamente' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    // Erro de banco ou outro erro inesperado
    console.error('[auth.js] Erro ao autenticar:', err.message);
    return res.status(500).json({ message: 'Erro interno de autenticação' });
  }
}

/**
 * Middleware opcional — popula req.user se houver token válido,
 * mas não bloqueia a requisição se não houver.
 * Útil para rotas semi-públicas (ex: healthcheck, onboarding).
 */
async function authenticateOptional(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_dev_key_32chars_ok'
    );

    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.empresa_id,
              e.nome AS empresa_nome, e.slug AS empresa_slug,
              e.plano AS empresa_plano, e.ativo AS empresa_ativa
       FROM usuarios u
       INNER JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = $1 AND u.ativo = true AND e.ativo = true`,
      [decoded.id]
    );

    if (rows.length > 0) {
      const u = rows[0];
      req.user = {
        id:         u.id,
        nome:       u.nome,
        email:      u.email,
        perfil:     u.perfil,
        empresa_id: u.empresa_id,
        empresa: {
          id:    u.empresa_id,
          nome:  u.empresa_nome,
          slug:  u.empresa_slug,
          plano: u.empresa_plano,
        },
      };
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
}

/**
 * Factory de middleware para verificar perfil/role.
 *
 * Uso:
 *   router.delete('/:id', authenticateToken, requireRole('administrador'), handler)
 *   router.post('/',       authenticateToken, requireRole('administrador','gerente'), handler)
 *
 * @param {...string} roles - Perfis que têm permissão para acessar a rota
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    if (!roles.includes(req.user.perfil)) {
      return res.status(403).json({
        message: `Acesso negado. Perfil '${req.user.perfil}' não tem permissão. Necessário: ${roles.join(' ou ')}.`,
      });
    }
    next();
  };
}

/**
 * Helper: garante que um registro pertence ao tenant do usuário logado.
 * Lança erro 403 se empresa_id_registro !== req.user.empresa_id.
 * Use após buscar um registro do banco para verificação adicional.
 *
 * @param {number}   tenantIdRegistro - empresa_id do registro no banco
 * @param {object}   user             - req.user
 * @param {object}   res              - Express Response (para retornar 403)
 * @returns {boolean} true se pertence ao tenant, false se bloqueado (e já respondeu)
 */
function assertTenantOwnership(tenantIdRegistro, user, res) {
  if (tenantIdRegistro !== user.empresa_id) {
    res.status(403).json({ message: 'Acesso negado: registro de outro tenant' });
    return false;
  }
  return true;
}

module.exports = {
  authenticateToken,
  authenticateOptional,
  requireRole,
  assertTenantOwnership,
  PERFIS_VALIDOS,
};
