const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { enviarRelatorioPlan } = require('../config/email');
const { criarOcorrencia } = require('../controllers/ocorrenciaController');

// Mock de dados em memória
let ocorrenciasMemory = [];

// Arquivos de persistência
const ID_FILE = path.join(__dirname, '../data/ocorrencia_counter.json');
const OCORRENCIAS_FILE = path.join(__dirname, '../data/ocorrencias.json');

// Função para carregar ocorrências do arquivo
function loadOcorrencias() {
  try {
    if (fs.existsSync(OCORRENCIAS_FILE)) {
      const data = fs.readFileSync(OCORRENCIAS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao carregar ocorrências:', error);
  }
  return [];
}

// Função para salvar ocorrências no arquivo
function saveOcorrencias(ocorrencias) {
  try {
    const dir = path.dirname(OCORRENCIAS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(OCORRENCIAS_FILE, JSON.stringify(ocorrencias, null, 2));
  } catch (error) {
    console.error('Erro ao salvar ocorrências:', error);
  }
}

// Carregar ocorrências ao iniciar
ocorrenciasMemory = loadOcorrencias();
console.log(`📦 ${ocorrenciasMemory.length} ocorrência(s) carregada(s) do arquivo`);

// Função para carregar o contador de IDs
function loadIdCounter() {
  try {
    if (fs.existsSync(ID_FILE)) {
      const data = fs.readFileSync(ID_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao carregar contador de IDs:', error);
  }
  return { lastDate: '', counter: 0 };
}

// Função para salvar o contador de IDs
function saveIdCounter(counterData) {
  try {
    const dir = path.dirname(ID_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ID_FILE, JSON.stringify(counterData, null, 2));
  } catch (error) {
    console.error('Erro ao salvar contador de IDs:', error);
  }
}

// Função para gerar número único de ocorrência
function gerarNumeroOcorrencia() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dataFormatada = `${dia}/${mes}`;
  const dataChave = hoje.toISOString().split('T')[0]; // YYYY-MM-DD para o arquivo
  
  let counterData = loadIdCounter();
  
  // Se mudou o dia, reseta o contador
  if (counterData.lastDate !== dataChave) {
    counterData = { lastDate: dataChave, counter: 0 };
  }
  
  // Incrementa o contador
  counterData.counter += 1;
  
  // Salva o novo contador
  saveIdCounter(counterData);
  
  // Retorna no formato: DD/MM-0001
  return `${dataFormatada}-${String(counterData.counter).padStart(4, '0')}`;
}

// Configurar multer para upload de arquivos
// Garantir que o diretório de uploads exista (evita ENOENT)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`📁 Diretório de uploads criado em: ${UPLOAD_DIR}`);
  }
} catch (mkdirErr) {
  console.error('Erro ao criar diretório de uploads:', mkdirErr);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|mp4|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Listar todas as ocorrências
router.get('/', async (req, res) => {
  try {
    let ocorrencias;
    
    try {
      const result = await db.query(`
        SELECT 
          o.*,
          o.numero as numero_ocorrencia,
          o.data_quebra as data_ocorrencia,
          COALESCE(c.nome, (o.observacoes::json->>'cliente_nome')) as cliente_nome,
          COALESCE(v.placa, (o.observacoes::json->>'veiculo_placa')) as veiculo_placa,
          v.modelo,
          COALESCE(tq.nome, (o.observacoes::json->>'tipo_ocorrencia')) as tipo_ocorrencia,
          tq.nome as tipo_quebra_nome,
          u.nome as criado_por_nome
        FROM ocorrencias o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN veiculos v ON o.veiculo_id = v.id
        LEFT JOIN tipos_quebra tq ON o.tipo_quebra_id = tq.id
        LEFT JOIN usuarios u ON o.criado_por = u.id
        ORDER BY o.created_at DESC
      `);
      ocorrencias = result.rows;
      console.log(`📋 ${ocorrencias.length} ocorrências encontradas no banco de dados`);
    } catch (dbError) {
      console.log('📝 Usando ocorrências da memória (banco indisponível)');
      console.error('Erro do banco:', dbError.message);
      ocorrencias = ocorrenciasMemory;
    }

    res.json(ocorrencias);
  } catch (error) {
    console.error('Erro ao listar ocorrências:', error);
    res.status(500).json({ message: 'Erro ao listar ocorrências' });
  }
});

// Buscar ocorrência por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let ocorrencia;

    try {
      console.log('🔍 Buscando ocorrência ID:', id);
      const result = await db.query(`
        SELECT 
          o.*,
          o.numero as numero_ocorrencia,
          o.data_quebra as data_ocorrencia,
          COALESCE(c.nome, (o.observacoes::json->>'cliente_nome')) as cliente_nome,
          c.contato as cliente_contato,
          COALESCE(v.placa, (o.observacoes::json->>'veiculo_placa')) as veiculo_placa,
          v.modelo,
          COALESCE(tq.nome, (o.observacoes::json->>'tipo_ocorrencia')) as tipo_ocorrencia,
          tq.nome as tipo_quebra_nome,
          u.nome as criado_por_nome,
          u_aprov.nome as aprovado_por_nome,
          (o.observacoes::json->>'horario_socorro') as horario_socorro,
          (o.observacoes::json->>'horario_saida') as horario_saida,
          (o.observacoes::json->>'houve_troca_veiculo') as houve_troca_veiculo,
          (o.observacoes::json->>'veiculo_substituto_placa') as veiculo_substituto_placa,
          (o.observacoes::json->>'houve_atraso') as houve_atraso,
          (o.observacoes::json->>'tempo_atraso') as tempo_atraso
        FROM ocorrencias o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN veiculos v ON o.veiculo_id = v.id
        LEFT JOIN tipos_quebra tq ON o.tipo_quebra_id = tq.id
        LEFT JOIN usuarios u ON o.criado_por = u.id
        LEFT JOIN usuarios u_aprov ON o.aprovado_por = u_aprov.id
        WHERE o.id = $1::integer OR o.numero = $1::text
      `, [id]);

      console.log('📊 Resultado da busca:', result.rows.length, 'registros');
      
      if (result.rows.length === 0) {
        console.log('❌ Ocorrência não encontrada no banco');
        return res.status(404).json({ message: 'Ocorrência não encontrada' });
      }

      console.log('✅ Ocorrência encontrada:', result.rows[0].numero);
      console.log('🕐 Horários extraídos:', {
        socorro: result.rows[0].horario_socorro,
        saida: result.rows[0].horario_saida
      });

      // Buscar logs/timeline
      const logs = await db.query(`
        SELECT ol.*, u.nome as usuario_nome
        FROM ocorrencia_logs ol
        LEFT JOIN usuarios u ON ol.usuario_id = u.id
        WHERE ol.ocorrencia_id = $1
        ORDER BY ol.created_at DESC
      `, [result.rows[0].id]);

      // Buscar anexos
      const anexos = await db.query(
        'SELECT * FROM ocorrencia_anexos WHERE ocorrencia_id = $1',
        [result.rows[0].id]
      );

      console.log('📎 Anexos encontrados:', anexos.rows.length);
      if (anexos.rows.length > 0) {
        console.log('📎 Primeiro anexo:', anexos.rows[0]);
      }

      ocorrencia = {
        ...result.rows[0],
        timeline: logs.rows,
        anexos: anexos.rows
      };
    } catch (dbError) {
      console.error('❌ Erro ao buscar do banco:', dbError.message);
      console.log('📝 Buscando ocorrência da memória');
      console.log('🔍 IDs em memória:', ocorrenciasMemory.map(o => ({ id: o.id, numero: o.numero_ocorrencia })));
      
      // Buscar por ID numérico ou por número de ocorrência
      ocorrencia = ocorrenciasMemory.find(o => 
        String(o.id) === String(id) || o.numero_ocorrencia === id || o.numero === id
      );
      
      if (!ocorrencia) {
        console.log('❌ Ocorrência não encontrada na memória');
        return res.status(404).json({ message: 'Ocorrência não encontrada' });
      }
      console.log('✅ Ocorrência encontrada na memória:', ocorrencia.numero_ocorrencia);
    }

    res.json(ocorrencia);
  } catch (error) {
    console.error('Erro ao buscar ocorrência:', error);
    res.status(500).json({ message: 'Erro ao buscar ocorrência' });
  }
});

// Criar nova ocorrência — via Supabase com validação (controller)
router.post('/', criarOcorrencia);

// LEGADO REMOVIDO — campos extras agora têm colunas dedicadas na tabela.
// Ver migration: add_ocorrencias_socorro_fields.sql.

// Atualizar ocorrência
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, descricao, ...outrosDados } = req.body;

    console.log('✏️ Atualizando ocorrência:', id, '| Novo status:', status);

    // Tentar atualizar no banco primeiro
    try {
      const result = await db.query(`
        UPDATE ocorrencias 
        SET status = $1, 
            descricao = COALESCE($2, descricao),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3::integer OR numero = $3::text
        RETURNING *
      `, [status || 'pendente', descricao, id]);

      if (result.rows.length === 0) {
        console.log('❌ Nenhuma ocorrência encontrada para atualizar');
        return res.status(404).json({ message: 'Ocorrência não encontrada' });
      }

      console.log('✅ Ocorrência atualizada no banco:', result.rows[0].numero);
      res.json(result.rows[0]);
    } catch (dbError) {
      console.error('Erro no banco, tentando memória:', dbError.message);
      
      // Fallback: Atualizar em memória
      const index = ocorrenciasMemory.findIndex(o => 
        String(o.id) === String(id) || o.numero_ocorrencia === id || o.numero === id
      );
      
      if (index === -1) {
        return res.status(404).json({ message: 'Ocorrência não encontrada' });
      }

      // Atualizar os dados
      ocorrenciasMemory[index] = {
        ...ocorrenciasMemory[index],
        status: status || ocorrenciasMemory[index].status,
        descricao: descricao || ocorrenciasMemory[index].descricao,
        ...outrosDados,
        updated_at: new Date().toISOString()
      };

      // Salvar no arquivo
      saveOcorrencias(ocorrenciasMemory);

      console.log(`✅ Ocorrência ${id} atualizada na memória`);
      res.json(ocorrenciasMemory[index]);
    }
  } catch (error) {
    console.error('Erro ao atualizar ocorrência:', error);
    res.status(500).json({ message: 'Erro ao atualizar ocorrência' });
  }
});

// Aprovar ocorrência
router.post('/:id/aprovar', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;

    const result = await db.query(`
      UPDATE ocorrencias 
      SET aprovado = true, aprovado_por = $1, data_aprovacao = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [usuario_id, id]);

    // Criar log
    await db.query(`
      INSERT INTO ocorrencia_logs (ocorrencia_id, tipo, descricao, usuario_id)
      VALUES ($1, 'aprovacao', 'Ocorrência aprovada', $2)
    `, [id, usuario_id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao aprovar ocorrência:', error);
    res.status(500).json({ message: 'Erro ao aprovar ocorrência' });
  }
});

// Finalizar plantão e gerar relatório
router.post('/finalizar-plantao', async (req, res) => {
  try {
    const { usuario_id, observacoes } = req.body;
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR');
    
    let ocorrenciasDoDia = [];
    
    // Buscar todas as ocorrências do dia
    try {
      const result = await db.query(`
        SELECT 
          o.*,
          c.nome as cliente_nome,
          u.nome as monitor_nome
        FROM ocorrencias o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN usuarios u ON o.monitor_id = u.id
        WHERE DATE(o.data_ocorrencia) = CURRENT_DATE
        ORDER BY o.numero_ocorrencia ASC
      `);
      ocorrenciasDoDia = result.rows;
    } catch (dbError) {
      console.log('📊 Usando ocorrências da memória para relatório');
      const hojeDateString = hoje.toISOString().split('T')[0];
      ocorrenciasDoDia = ocorrenciasMemory.filter(o => 
        o.data_ocorrencia && 
        new Date(o.data_ocorrencia).toISOString().split('T')[0] === hojeDateString
      );
    }

    // Estatísticas do dia
    const totalOcorrencias = ocorrenciasDoDia.length;
    const concluidas = ocorrenciasDoDia.filter(o => o.status === 'concluido').length;
    const emAndamento = ocorrenciasDoDia.filter(o => o.status === 'em_andamento').length;
    const pendentes = ocorrenciasDoDia.filter(o => o.status === 'pendente').length;
    const comAtraso = ocorrenciasDoDia.filter(o => o.houve_atraso === 'sim').length;
    const comTrocaVeiculo = ocorrenciasDoDia.filter(o => o.houve_troca_veiculo === 'sim').length;

    // Gerar relatório
    const relatorio = {
      data: dataFormatada,
      data_geracao: hoje,
      usuario_id,
      observacoes: observacoes || '',
      estatisticas: {
        total_ocorrencias: totalOcorrencias,
        concluidas,
        em_andamento: emAndamento,
        pendentes,
        com_atraso: comAtraso,
        com_troca_veiculo: comTrocaVeiculo
      },
      ocorrencias: ocorrenciasDoDia
    };

    // Salvar relatório em arquivo JSON
    const relatorioFileName = `relatorio-${hoje.toISOString().split('T')[0]}.json`;
    const relatorioPath = path.join(__dirname, '../data/relatorios', relatorioFileName);
    
    try {
      const dirRelatorios = path.dirname(relatorioPath);
      if (!fs.existsSync(dirRelatorios)) {
        fs.mkdirSync(dirRelatorios, { recursive: true });
      }
      fs.writeFileSync(relatorioPath, JSON.stringify(relatorio, null, 2));
      console.log(`✅ Relatório gerado: ${relatorioFileName}`);
    } catch (fileError) {
      console.error('Erro ao salvar relatório:', fileError);
    }

    // Enviar email com o relatório
    console.log('📧 Enviando relatório por email...');
    const resultadoEmail = await enviarRelatorioPlan(relatorio, observacoes);
    
    if (resultadoEmail.sucesso) {
      console.log('✅ Email enviado com sucesso!');
    } else {
      console.warn(`⚠️ Aviso ao enviar email: ${resultadoEmail.erro}`);
      // Continua mesmo que email falhe - o relatório foi gerado
    }

    res.json({
      message: 'Plantão finalizado com sucesso',
      relatorio,
      email: resultadoEmail
    });
  } catch (error) {
    console.error('Erro ao finalizar plantão:', error);
    res.status(500).json({ message: 'Erro ao finalizar plantão', erro: error.message });
  }
});

// Rota para download de anexos
router.get('/anexo/:ocorrenciaId/:anexoId', async (req, res) => {
  try {
    const { ocorrenciaId, anexoId } = req.params;
    
    console.log('📎 Buscando anexo:', { ocorrenciaId, anexoId });
    
    // Buscar anexo no banco de dados
    const result = await db.query(
      'SELECT * FROM ocorrencia_anexos WHERE id = $1 AND ocorrencia_id = $2',
      [anexoId, ocorrenciaId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Anexo não encontrado' });
    }
    
    const anexo = result.rows[0];
    
    // O caminho já está completo no banco, não precisa fazer join
    let filePath = anexo.caminho;
    
    // Se o caminho for relativo (ex: uploads/arquivo.jpg), fazer join
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(__dirname, '..', filePath);
    }
    
    console.log('📂 Caminho do arquivo:', filePath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      console.error('❌ Arquivo não encontrado:', filePath);
      return res.status(404).json({ message: 'Arquivo não encontrado no servidor' });
    }
    
    // Configurar headers para download
    res.setHeader('Content-Type', anexo.tipo_arquivo);
    res.setHeader('Content-Disposition', `attachment; filename="${anexo.nome_arquivo}"`);
    
    // Enviar arquivo
    res.sendFile(filePath);
    console.log('✅ Anexo enviado:', anexo.nome_arquivo);
  } catch (error) {
    console.error('❌ Erro ao buscar anexo:', error);
    res.status(500).json({ message: 'Erro ao buscar anexo' });
  }
});

// Rota para visualizar anexo (inline, sem download)
router.get('/anexo/:ocorrenciaId/:anexoId/view', async (req, res) => {
  try {
    const { ocorrenciaId, anexoId } = req.params;
    
    // Buscar anexo no banco de dados
    const result = await db.query(
      'SELECT * FROM ocorrencia_anexos WHERE id = $1 AND ocorrencia_id = $2',
      [anexoId, ocorrenciaId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Anexo não encontrado' });
    }
    
    const anexo = result.rows[0];
    
    // O caminho já está completo no banco, não precisa fazer join
    let filePath = anexo.caminho;
    
    // Se o caminho for relativo, fazer join
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(__dirname, '..', filePath);
    }
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado no servidor' });
    }
    
    // Configurar headers para visualização inline
    res.setHeader('Content-Type', anexo.tipo_arquivo);
    res.setHeader('Content-Disposition', `inline; filename="${anexo.nome_arquivo}"`);
    
    // Enviar arquivo
    res.sendFile(filePath);
  } catch (error) {
    console.error('Erro ao visualizar anexo:', error);
    res.status(500).json({ message: 'Erro ao visualizar anexo' });
  }
});

// Função para acessar ocorrências da memória (usado pelo dashboard)
router.getOcorrenciasMemory = function() {
  return ocorrenciasMemory;
};

module.exports = router;
