const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Banco de dados em memória temporário (para desenvolvimento sem PostgreSQL)
let usersMemory = [
  {
    id: 1,
    nome: 'Administrador',
    email: 'admin@sistemacco.com',
    senha: '$2a$10$EExPvC68u8D04Zt7b2q5cugf2ESr0IDl6OeCvuWthhYuiZ5LTz5Ty', // admin123
    cargo: 'Administrador',
    perfil: 'administrador',
    ativo: true
  },
  {
    id: 2,
    nome: 'Usuário Teste',
    email: 'teste@teste.com',
    senha: '$2a$10$EExPvC68u8D04Zt7b2q5cugf2ESr0IDl6OeCvuWthhYuiZ5LTz5Ty', // admin123
    cargo: 'Monitor',
    perfil: 'monitor',
    ativo: true
  },
  {
    id: 3,
    nome: 'Teste Usuario',
    email: 'teste@usuario.com',
    senha: '$2a$10$EExPvC68u8D04Zt7b2q5cugf2ESr0IDl6OeCvuWthhYuiZ5LTz5Ty', // admin123
    cargo: 'Operador',
    perfil: 'operador',
    ativo: true
  }
];
let nextUserId = 4;

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tentar buscar do banco, se falhar usa memória
    let user = null;
    try {
      const result = await db.query(
        'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
        [email]
      );
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } catch (dbError) {
      // Se banco não estiver disponível, usar memória
      console.log('📝 Usando autenticação em memória (banco indisponível)');
      user = usersMemory.find(u => u.email === email);
    }

    if (!user) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.senha);
    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    // Gerar token
    const token = jwt.sign(
      { id: user.id, email: user.email, perfil: user.perfil },
      process.env.JWT_SECRET || 'fallback_secret_dev_key_32chars_ok',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remover senha da resposta
    const userResponse = { ...user };
    delete userResponse.senha;

    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Cadastro de novo usuário
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha, cargo, perfil } = req.body;

    // Validações
    if (!nome || !email || !senha) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    let newUser = null;

    // Tentar salvar no banco, se falhar usa memória
    try {
      // Verificar se email já existe
      const existingUser = await db.query(
        'SELECT id FROM usuarios WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Este email já está cadastrado' });
      }

      // Inserir usuário
      const result = await db.query(
        `INSERT INTO usuarios (nome, email, senha, cargo, perfil)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, email, cargo, perfil, created_at`,
        [nome, email, hashedPassword, cargo || null, perfil || 'monitor']
      );

      newUser = result.rows[0];
    } catch (dbError) {
      // Se banco não estiver disponível, usar memória
      console.log('📝 Usando cadastro em memória (banco indisponível)');
      
      // Verificar se email já existe na memória
      if (usersMemory.find(u => u.email === email)) {
        return res.status(400).json({ message: 'Este email já está cadastrado' });
      }

      newUser = {
        id: nextUserId++,
        nome,
        email,
        senha: hashedPassword,
        cargo: cargo || null,
        perfil: perfil || 'monitor',
        created_at: new Date()
      };

      usersMemory.push(newUser);
    }

    // Gerar token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, perfil: newUser.perfil },
      process.env.JWT_SECRET || 'fallback_secret_dev_key_32chars_ok',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remover senha da resposta
    const userResponse = { ...newUser };
    delete userResponse.senha;

    res.status(201).json({ 
      message: 'Usuário cadastrado com sucesso',
      user: userResponse,
      token 
    });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).json({ message: 'Erro ao cadastrar usuário' });
  }
});

// Recuperar senha
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await db.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Por segurança, sempre retorna sucesso
      return res.json({ message: 'Email de recuperação enviado' });
    }

    // TODO: Implementar envio de email
    res.json({ message: 'Email de recuperação enviado' });
  } catch (error) {
    console.error('Erro ao recuperar senha:', error);
    res.status(500).json({ message: 'Erro ao recuperar senha' });
  }
});

module.exports = router;
