const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Mock de dados em memória
const clientesMock = [
  { id: 1, nome: '51 MULLER', cnpj: '12.345.678/0001-01', contato: '(81) 3333-1111', email: 'contato@51muller.com', ativo: true },
  { id: 2, nome: 'ACHÊ', cnpj: '23.456.789/0001-02', contato: '(81) 3333-2222', email: 'contato@ache.com', ativo: true },
  { id: 3, nome: 'AMANCO', cnpj: '34.567.890/0001-03', contato: '(81) 3333-3333', email: 'contato@amanco.com', ativo: true },
  { id: 4, nome: 'AMCOR', cnpj: '45.678.901/0001-04', contato: '(81) 3333-4444', email: 'contato@amcor.com', ativo: true },
  { id: 5, nome: 'CAMPARI', cnpj: '56.789.012/0001-05', contato: '(81) 3333-5555', email: 'contato@campari.com', ativo: true },
  { id: 6, nome: 'CBA', cnpj: '67.890.123/0001-06', contato: '(81) 3333-6666', email: 'contato@cba.com', ativo: true },
  { id: 7, nome: 'CONSAG', cnpj: '78.901.234/0001-07', contato: '(81) 3333-7777', email: 'contato@consag.com', ativo: true },
  { id: 8, nome: 'CRISTALPET', cnpj: '89.012.345/0001-08', contato: '(81) 3333-8888', email: 'contato@cristalpet.com', ativo: true },
  { id: 9, nome: 'DECAL', cnpj: '90.123.456/0001-09', contato: '(81) 3333-9999', email: 'contato@decal.com', ativo: true },
  { id: 10, nome: 'HDH', cnpj: '01.234.567/0001-10', contato: '(81) 3334-1111', email: 'contato@hdh.com', ativo: true },
  { id: 11, nome: 'HOTEL VIVÁ', cnpj: '12.345.678/0001-11', contato: '(81) 3334-2222', email: 'contato@hotelviva.com', ativo: true },
  { id: 12, nome: 'INBETTA', cnpj: '23.456.789/0001-12', contato: '(81) 3334-3333', email: 'contato@inbetta.com', ativo: true },
  { id: 13, nome: 'JCPM', cnpj: '34.567.890/0001-13', contato: '(81) 3334-4444', email: 'contato@jcpm.com', ativo: true },
  { id: 14, nome: 'JEEP', cnpj: '45.678.901/0001-14', contato: '(81) 3334-5555', email: 'contato@jeep.com', ativo: true },
  { id: 15, nome: 'MARELLI', cnpj: '56.789.012/0001-15', contato: '(81) 3334-6666', email: 'contato@marelli.com', ativo: true },
  { id: 16, nome: 'MASTERFOOD', cnpj: '67.890.123/0001-16', contato: '(81) 3334-7777', email: 'contato@masterfood.com', ativo: true },
  { id: 17, nome: 'MERCADO LIVRE', cnpj: '78.901.234/0001-17', contato: '(81) 40028922', email: 'contato@mercadolivre.com', ativo: true },
  { id: 18, nome: 'MONTE RODOVIAS', cnpj: '89.012.345/0001-18', contato: '(81) 3335-1111', email: 'contato@monterodovias.com', ativo: true },
  { id: 19, nome: 'MOURA', cnpj: '90.123.456/0001-19', contato: '(81) 3335-2222', email: 'contato@moura.com', ativo: true },
  { id: 20, nome: 'OMIRP', cnpj: '01.234.567/0001-20', contato: '(81) 3335-3333', email: 'contato@omirp.com', ativo: true },
  { id: 21, nome: 'PIATEC', cnpj: '12.345.678/0001-21', contato: '(81) 3335-4444', email: 'contato@piatec.com', ativo: true },
  { id: 22, nome: 'TECON', cnpj: '23.456.789/0001-22', contato: '(81) 3335-5555', email: 'contato@tecon.com', ativo: true },
  { id: 23, nome: 'TURISMO', cnpj: '34.567.890/0001-23', contato: '(81) 3335-6666', email: 'contato@turismo.com', ativo: true },
  { id: 24, nome: 'VILA GALÉ', cnpj: '45.678.901/0001-24', contato: '(81) 3335-7777', email: 'contato@vilagale.com', ativo: true }
];

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    let clientes;
    
    try {
      const result = await db.query(
        'SELECT * FROM clientes WHERE ativo = true ORDER BY nome'
      );
      clientes = result.rows;
    } catch (dbError) {
      console.log('📝 Usando clientes mockados (banco indisponível)');
      clientes = clientesMock;
    }
    
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro ao listar clientes' });
  }
});

// Criar cliente
router.post('/', async (req, res) => {
  try {
    const { 
      nome, cnpj, contato, email, endereco, telefone, whatsapp, 
      bairro, cidade, estado, cep,
      possui_sla, tipo_sla, tempo_sla_minutos,
      sla_horas, sla, sla_nivel, 
      prioridade_1, prioridade_2, prioridade_3, 
      ano_frota, observacoes 
    } = req.body;

    console.log('📝 Criando cliente:', { nome, cnpj });

    // Validação simples
    if (!nome) {
      return res.status(400).json({ message: 'Campo obrigatório ausente: nome' });
    }

    if (!cnpj) {
      return res.status(400).json({ message: 'Campo obrigatório ausente: cnpj' });
    }

    // Aceitar tanto 'sla_horas' quanto 'sla' vindo do frontend
    let slaValue = sla_horas || sla || 2;
    
    // Converter texto para número (ex: "1 hora" -> 1, "2 horas" -> 2)
    if (typeof slaValue === 'string') {
      const match = slaValue.match(/(\d+)/);
      slaValue = match ? parseInt(match[1]) : 2;
    }
    
    console.log('🔢 SLA convertido para:', slaValue);

    try {
      const result = await db.query(`
        INSERT INTO clientes (
          nome, cnpj, contato, email, endereco, 
          sla_horas, sla_nivel, 
          prioridade_1, prioridade_2, prioridade_3, 
          ano_frota
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        nome, 
        cnpj || '', 
        contato || '', 
        email || '', 
        endereco || '', 
        slaValue,
        sla_nivel || 'ALTO',
        prioridade_1 || 'WHATSAPP',
        prioridade_2 || 'LIGAÇÃO',
        prioridade_3 || 'E-MAIL',
        ano_frota || null
      ]);

      console.log('✅ Cliente criado com sucesso:', result.rows[0].nome);
      res.status(201).json(result.rows[0]);
    } catch (dbErr) {
      console.error('❌ Erro ao criar cliente (db):', dbErr);
      console.error('Detalhes:', dbErr.message);
      console.error('Código:', dbErr.code);
      
      if (dbErr.code === '23505') {
        return res.status(409).json({ message: 'CNPJ já cadastrado' });
      }
      
      if (dbErr.code === '42703') {
        return res.status(500).json({ 
          message: 'Erro na estrutura do banco de dados - coluna não existe',
          error: dbErr.message 
        });
      }
      
      // Retornar erro mais específico
      res.status(500).json({ 
        message: 'Erro ao criar cliente no banco de dados',
        error: dbErr.message,
        code: dbErr.code 
      });
    }
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erro ao criar cliente',
      error: error.message 
    });
  }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dadosAtualizados = req.body;

    console.log('📝 Recebendo atualização para cliente ID:', id);
    console.log('📝 Dados recebidos:', dadosAtualizados);

    try {
      const result = await db.query(`
        UPDATE clientes 
        SET nome = $1, cnpj = $2, contato = $3, email = $4, endereco = $5, 
            telefone = $6, whatsapp = $7, bairro = $8, cidade = $9, estado = $10, 
            cep = $11, possui_sla = $12, tipo_sla = $13, tempo_sla_minutos = $14, 
            observacoes = $15, sla_nivel = $16, prioridade_1 = $17, prioridade_2 = $18,
            prioridade_3 = $19, ano_frota = $20
        WHERE id = $21
        RETURNING *
      `, [
        dadosAtualizados.nome, dadosAtualizados.cnpj, dadosAtualizados.contato, 
        dadosAtualizados.email, dadosAtualizados.endereco, dadosAtualizados.telefone,
        dadosAtualizados.whatsapp, dadosAtualizados.bairro, dadosAtualizados.cidade,
        dadosAtualizados.estado, dadosAtualizados.cep, dadosAtualizados.possui_sla,
        dadosAtualizados.tipo_sla, dadosAtualizados.tempo_sla_minutos, 
        dadosAtualizados.observacoes,
        dadosAtualizados.sla_nivel || null,
        dadosAtualizados.prioridade_1 || null,
        dadosAtualizados.prioridade_2 || null,
        dadosAtualizados.prioridade_3 || null,
        dadosAtualizados.ano_frota || null,
        id
      ]);
      
      if (result.rows.length === 0) {
        console.log('⚠️ Cliente não encontrado no banco de dados');
        return res.status(404).json({ message: 'Cliente não encontrado' });
      }
      
      console.log('✅ Cliente atualizado com sucesso no banco de dados');
      res.json(result.rows[0]);
    } catch (dbError) {
      console.log('❌ Erro no banco de dados:', dbError.message);
      console.log('📝 Cliente atualizado localmente (banco indisponível)');
      
      // Simular atualização bem-sucedida
      const index = clientesMock.findIndex(c => c.id == id || c.id === id);
      if (index !== -1) {
        clientesMock[index] = { ...clientesMock[index], ...dadosAtualizados };
        res.json(clientesMock[index]);
      } else {
        res.json({ ...dadosAtualizados, id });
      }
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar cliente:', error);
    res.status(500).json({ message: 'Erro ao atualizar cliente', error: error.message });
  }
});

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      const result = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Cliente não encontrado' });
      }
      res.json(result.rows[0]);
    } catch (dbError) {
      console.log('📝 Buscando cliente mockado (banco indisponível)');
      const cliente = clientesMock.find(c => c.id == id || c.id === id);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente não encontrado' });
      }
      res.json(cliente);
    }
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro ao buscar cliente' });
  }
});

// Deletar cliente (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('UPDATE clientes SET ativo = false WHERE id = $1', [id]);

    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ message: 'Erro ao excluir cliente' });
  }
});

module.exports = router;
