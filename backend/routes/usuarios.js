const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Mock de usuários em memória
const usuariosMock = [
  { id: 1, nome: 'Administrador', email: 'admin@sistemacco.com', perfil: 'administrador', cargo: 'Administrador', ativo: true },
  { id: 2, nome: 'João Silva', email: 'joao@sistemacco.com', perfil: 'monitor', cargo: 'Monitor Operacional', ativo: true },
  { id: 3, nome: 'Maria Santos', email: 'maria@sistemacco.com', perfil: 'monitor', cargo: 'Monitor Operacional', ativo: true },
  { id: 4, nome: 'Pedro Oliveira', email: 'pedro@sistemacco.com', perfil: 'operador', cargo: 'Operador CCO', ativo: true },
  { id: 5, nome: 'Ana Costa', email: 'ana@sistemacco.com', perfil: 'monitor', cargo: 'Monitor Sênior', ativo: true }
];

router.get('/', async (req, res) => {
  try {
    let usuarios;
    
    try {
      const result = await db.query(
        'SELECT id, nome, email, perfil, cargo, ativo FROM usuarios WHERE ativo = true ORDER BY nome'
      );
      usuarios = result.rows;
    } catch (dbError) {
      console.log('📝 Usando usuários mockados (banco indisponível)');
      usuarios = usuariosMock;
    }
    
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});

module.exports = router;
