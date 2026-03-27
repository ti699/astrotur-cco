'use strict';

/**
 * routes/empresas.js
 *
 * Rotas de gerenciamento de tenants (empresas).
 *
 * Rotas públicas (onboarding):
 *   POST /api/empresas/registrar   — Cria empresa + admin inicial (self-service SaaS)
 *
 * Rotas privadas (requerem token):
 *   GET  /api/empresas/atual       — Dados da empresa logada
 *   PUT  /api/empresas/atual       — Atualizar empresa logada (admin apenas)
 *   GET  /api/empresas/usuarios    — Usuários da empresa (admin/gerente)
 *   POST /api/empresas/usuarios    — Criar usuário na empresa (admin apenas)
 *
 * SEGURANÇA:
 *   - Usuários comuns nunca podem ver dados de outras empresas.
 *   - O empresa_id da empresa "atual" vem sempre de req.user.empresa_id.
 *   - Criação de usuário via /empresas/usuarios respeita o tenant do admin logado.
 */

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/database');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// ─── Validação básica de slug ─────────────────────────────────────────────────
function slugValido(slug) {
  return /^[a-z0-9][a-z0-9-]{2,98}[a-z0-9]$/.test(slug);
}

// ─── POST /api/empresas/registrar ─────────────────────────────────────────────
// Rota pública de onboarding: cria a empresa e o primeiro usuário administrador.
// Fluxo: empresa se cadastra → sistema cria tenant → sistema cria admin inicial.
router.post('/registrar', async (req, res) => {
  const {
    // Dados da empresa
    empresa_nome,
    empresa_slug,
    empresa_cnpj,
    empresa_email,
    empresa_telefone,
    empresa_plano = 'basico',
    // Dados do admin inicial
    admin_nome,
    admin_email,
    admin_senha,
    admin_cargo,
  } = req.body;

  // ── Validações básicas ────────────────────────────────────────────────────
  const erros = [];
  if (!empresa_nome?.trim())  erros.push('empresa_nome é obrigatório');
  if (!empresa_slug?.trim())  erros.push('empresa_slug é obrigatório');
  if (!empresa_email?.trim()) erros.push('empresa_email é obrigatório');
  if (!admin_nome?.trim())    erros.push('admin_nome é obrigatório');
  if (!admin_email?.trim())   erros.push('admin_email é obrigatório');
  if (!admin_senha)           erros.push('admin_senha é obrigatório');
  if (admin_senha && admin_senha.length < 8) erros.push('admin_senha deve ter ao menos 8 caracteres');
  if (empresa_slug && !slugValido(empresa_slug.toLowerCase())) {
    erros.push('empresa_slug deve conter apenas letras minúsculas, números e hífens (3-100 chars)');
  }

  if (erros.length > 0) {
    return res.status(400).json({ message: 'Dados inválidos', erros });
  }

  const slugNorm      = empresa_slug.toLowerCase().trim();
  const adminEmailNorm = admin_email.toLowerCase().trim();

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Verificar se slug já existe
    const slugExiste = await client.query(
      'SELECT id FROM empresas WHERE slug = $1', [slugNorm]
    );
    if (slugExiste.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Este identificador (slug) já está em uso. Escolha outro.' });
    }

    // Verificar se email do admin já existe
    const emailExiste = await client.query(
      'SELECT id FROM usuarios WHERE email = $1', [adminEmailNorm]
    );
    if (emailExiste.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Este email de administrador já está em uso.' });
    }

    // 1. Criar a empresa
    const empresaResult = await client.query(
      `INSERT INTO empresas (nome, slug, cnpj, email_responsavel, telefone, plano, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, nome, slug, plano`,
      [
        empresa_nome.trim(),
        slugNorm,
        empresa_cnpj?.trim() || null,
        empresa_email.trim(),
        empresa_telefone?.trim() || null,
        ['basico','profissional','enterprise'].includes(empresa_plano)
          ? empresa_plano : 'basico',
      ]
    );
    const empresa = empresaResult.rows[0];

    // 2. Criar usuário admin
    const senhaHash = await bcrypt.hash(admin_senha, 12);
    const adminResult = await client.query(
      `INSERT INTO usuarios (nome, email, senha, cargo, perfil, ativo, empresa_id)
       VALUES ($1, $2, $3, $4, 'administrador', true, $5)
       RETURNING id, nome, email, perfil, cargo`,
      [
        admin_nome.trim(),
        adminEmailNorm,
        senhaHash,
        admin_cargo?.trim() || 'Administrador',
        empresa.id,
      ]
    );

    await client.query('COMMIT');

    const admin = adminResult.rows[0];
    console.log(`✅ Empresa criada: ${empresa.slug} (id: ${empresa.id}) | Admin: ${admin.email}`);

    return res.status(201).json({
      message: 'Empresa registrada com sucesso! Faça login com as credenciais do administrador.',
      empresa: { id: empresa.id, nome: empresa.nome, slug: empresa.slug },
      admin:   { id: admin.id,   nome: admin.nome,   email: admin.email },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar empresa:', err.message);
    return res.status(500).json({ message: 'Erro ao registrar empresa' });
  } finally {
    client.release();
  }
});

// ─── GET /api/empresas/atual ──────────────────────────────────────────────────
// Retorna os dados da empresa do usuário autenticado.
router.get('/atual', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, slug, cnpj, email_responsavel, telefone, plano, ativo, created_at
       FROM empresas
       WHERE id = $1`,
      [req.user.empresa_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar empresa:', err.message);
    return res.status(500).json({ message: 'Erro ao buscar empresa' });
  }
});

// ─── PUT /api/empresas/atual ──────────────────────────────────────────────────
// Atualiza os dados da empresa. Apenas administradores.
router.put('/atual', authenticateToken, requireRole('administrador'), async (req, res) => {
  const { nome, cnpj, email_responsavel, telefone } = req.body;

  if (!nome?.trim()) {
    return res.status(400).json({ message: 'nome é obrigatório' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE empresas
       SET nome = $1, cnpj = $2, email_responsavel = $3, telefone = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, nome, slug, cnpj, email_responsavel, telefone, plano`,
      [nome.trim(), cnpj?.trim() || null, email_responsavel?.trim() || null, telefone?.trim() || null, req.user.empresa_id]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar empresa:', err.message);
    return res.status(500).json({ message: 'Erro ao atualizar empresa' });
  }
});

// ─── GET /api/empresas/usuarios ───────────────────────────────────────────────
// Lista usuários da empresa. Admin e gerente podem ver.
router.get('/usuarios', authenticateToken, requireRole('administrador', 'gerente'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, email, perfil, cargo, ativo, created_at
       FROM usuarios
       WHERE empresa_id = $1
       ORDER BY nome`,
      [req.user.empresa_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários da empresa:', err.message);
    return res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});

// ─── POST /api/empresas/usuarios ─────────────────────────────────────────────
// Cria usuário na empresa do admin logado. Apenas administradores.
// Nota: o empresa_id é sempre o do admin logado, nunca o do body.
router.post('/usuarios', authenticateToken, requireRole('administrador'), async (req, res) => {
  const { nome, email, senha = 'Mudar@123', perfil = 'monitor', cargo } = req.body;

  if (!nome?.trim() || !email?.trim()) {
    return res.status(400).json({ message: 'nome e email são obrigatórios' });
  }
  if (senha.length < 8) {
    return res.status(400).json({ message: 'senha deve ter ao menos 8 caracteres' });
  }

  const emailNorm = email.toLowerCase().trim();

  try {
    const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [emailNorm]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'Email já cadastrado no sistema' });
    }

    const hash = await bcrypt.hash(senha, 12);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, cargo, ativo, empresa_id)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, nome, email, perfil, cargo, ativo`,
      [nome.trim(), emailNorm, hash, perfil, cargo?.trim() || null, req.user.empresa_id]
    );

    console.log(`✅ Usuário criado: ${rows[0].email} | Empresa: ${req.user.empresa_id}`);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao criar usuário na empresa:', err.message);
    return res.status(500).json({ message: 'Erro ao criar usuário' });
  }
});

// ─── PATCH /api/empresas/usuarios/:id ────────────────────────────────────────
// Ativa/desativa ou altera perfil de usuário da empresa. Admin apenas.
router.patch('/usuarios/:id', authenticateToken, requireRole('administrador'), async (req, res) => {
  const { id } = req.params;
  const { ativo, perfil, cargo, nome } = req.body;

  try {
    // Garante que o usuário pertence à empresa do admin logado
    const check = await db.query(
      'SELECT id FROM usuarios WHERE id = $1 AND empresa_id = $2',
      [parseInt(id), req.user.empresa_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado nesta empresa' });
    }

    const updates = [];
    const values  = [];
    let p = 1;

    if (nome    !== undefined) { updates.push(`nome = $${p++}`);   values.push(nome.trim()); }
    if (perfil  !== undefined) { updates.push(`perfil = $${p++}`); values.push(perfil); }
    if (cargo   !== undefined) { updates.push(`cargo = $${p++}`);  values.push(cargo || null); }
    if (ativo   !== undefined) { updates.push(`ativo = $${p++}`);  values.push(Boolean(ativo)); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    values.push(parseInt(id));
    const { rows } = await db.query(
      `UPDATE usuarios SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${p}
       RETURNING id, nome, email, perfil, cargo, ativo`,
      values
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err.message);
    return res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

module.exports = router;
