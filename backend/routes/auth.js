'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

// ─── Helper: monta e assina o JWT com contexto de tenant ─────────────────────
function gerarToken(user) {
  return jwt.sign(
    {
      id:         user.id,
      email:      user.email,
      perfil:     user.perfil,
      empresa_id: user.empresa_id, // NUNCA confiado na requisição — apenas informativo no token
    },
    process.env.JWT_SECRET || 'fallback_secret_dev_key_32chars_ok',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
// Login multi-tenant: busca o usuário pelo email, verifica senha e retorna
// token com empresa_id. O empresa_id é sempre derivado do banco, nunca do body.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const emailNorm = String(email).toLowerCase().trim();

    // Busca usuário + empresa em uma única query para verificar ativo de ambos
    const result = await db.query(
      `SELECT u.*, e.id AS e_id, e.nome AS empresa_nome, e.slug AS empresa_slug,
              e.plano AS empresa_plano, e.ativo AS empresa_ativa
       FROM usuarios u
       INNER JOIN empresas e ON e.id = u.empresa_id
       WHERE u.email = $1`,
      [emailNorm]
    );

    // Mensagem genérica para não revelar se o email existe
    const ERR_CREDENCIAIS = 'Email ou senha inválidos';

    if (result.rows.length === 0) {
      return res.status(401).json({ message: ERR_CREDENCIAIS });
    }

    const user = result.rows[0];

    if (!user.ativo) {
      return res.status(401).json({ message: 'Usuário inativo' });
    }

    if (!user.empresa_ativa) {
      return res.status(403).json({ message: 'Empresa inativa ou suspensa' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(password, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: ERR_CREDENCIAIS });
    }

    const token = gerarToken(user);

    // Montar resposta sem dados sensíveis
    const userResponse = {
      id:         user.id,
      nome:       user.nome,
      email:      user.email,
      perfil:     user.perfil,
      cargo:      user.cargo,
      empresa_id: user.empresa_id,
      empresa: {
        id:    user.e_id,
        nome:  user.empresa_nome,
        slug:  user.empresa_slug,
        plano: user.empresa_plano,
      },
    };

    return res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// ─── POST /auth/alterar-senha ─────────────────────────────────────────────────
// Exige token válido. O usuário só pode alterar a própria senha.
// Não aceita id via body — usa req.user.id derivado do token.
router.post('/alterar-senha', authenticateToken, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const userId = req.user.id; // Sempre do token, nunca do body

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ message: 'senhaAtual e novaSenha são obrigatórios' });
    }
    if (novaSenha.length < 8) {
      return res.status(400).json({ message: 'A nova senha deve ter ao menos 8 caracteres' });
    }

    const result = await db.query(
      'SELECT id, senha FROM usuarios WHERE id = $1 AND empresa_id = $2 AND ativo = true',
      [userId, req.user.empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const senhaValida = await bcrypt.compare(senhaAtual, result.rows[0].senha);
    if (!senhaValida) {
      return res.status(401).json({ message: 'Senha atual incorreta' });
    }

    const hash = await bcrypt.hash(novaSenha, 12);
    await db.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hash, userId]);

    return res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return res.status(500).json({ message: 'Erro ao alterar senha' });
  }
});

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
// Pública — sempre retorna sucesso para não revelar quais emails existem.
// TODO: Implementar envio de e-mail de recuperação.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email é obrigatório' });

    // Verificação silenciosa (não revela se email existe)
    await db.query('SELECT id FROM usuarios WHERE email = $1', [
      String(email).toLowerCase().trim()
    ]).catch(() => null);

    // TODO: disparar email de recuperação com token temporário
    return res.json({ message: 'Se o email existir, você receberá as instruções em breve.' });
  } catch (error) {
    console.error('Erro ao recuperar senha:', error);
    return res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
// Retorna os dados do usuário autenticado com contexto da empresa.
// Útil para o frontend verificar/renovar sessão sem fazer novo login.
router.get('/me', authenticateToken, (req, res) => {
  // req.user já foi populado pelo middleware com dados frescos do banco
  return res.json({ user: req.user });
});

module.exports = router;
