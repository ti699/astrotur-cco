const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Importar configurações de segurança (instalar: npm install helmet express-rate-limit)
// Comentado por enquanto - descomente após instalar as dependências
// const { helmetConfig, rateLimiters } = require('./config/security');
// app.use(helmetConfig);

// Configuração de CORS com segurança
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  // Domínio de produção do frontend (Vercel)
  'https://astrotur-cco.vercel.app',
];

// Adiciona FRONTEND_URL do env se definido (ex: URL customizada ou preview)
if (process.env.FRONTEND_URL) {
  const urls = process.env.FRONTEND_URL.split(',').map(u => u.trim()).filter(Boolean);
  urls.forEach(u => { if (!allowedOrigins.includes(u)) allowedOrigins.push(u); });
}

// Em produção, adiciona a própria URL do backend na Vercel (VERCEL_URL = backend)
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem origin (mobile apps, curl, Postman, etc)
    if (!origin) return callback(null, true);

    const allowed =
      allowedOrigins.includes(origin) ||
      // Aceita qualquer subdomínio *.vercel.app (preview deployments)
      /^https:\/\/[a-z0-9-]+-[a-z0-9]+(-[a-z0-9]+)*\.vercel\.app$/.test(origin) ||
      origin === 'https://astrotur-cco.vercel.app';

    if (allowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqueado para origem: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting - descomente após instalar express-rate-limit
// app.use('/api/', rateLimiters.api);
// app.use('/api/auth/login', rateLimiters.auth);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ocorrencias', require('./routes/ocorrencias'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/veiculos', require('./routes/veiculos'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/motoristas', require('./routes/motoristas'));
app.use('/api/manutencoes', require('./routes/manutencoes'));
app.use('/api/abastecimentos', require('./routes/abastecimentos'));
app.use('/api/avarias', require('./routes/avarias'));
app.use('/api/banco-distancias', require('./routes/banco-distancias'));
app.use('/api/portaria', require('./routes/portaria'));
app.use('/api/tipos-quebra', require('./routes/tipos-quebra'));
app.use('/api/relatorios', require('./routes/relatorios'));
app.use('/api/plantonistas', require('./routes/plantonistas'));

// Lookup endpoints (Supabase) — para popular selects dos formulários
const lookupRouter = require('./routes/lookup');
app.use('/api/lookup', lookupRouter);

// ASTRO — módulo de chamados de socorro
app.use('/api/v1/socorro', require('./routes/socorro'));

// Portaria v1 — endpoints versionados com regras de negócio completas
app.use('/api/v1/portaria', require('./routes/portaria-v1'));

// E-mail — envio de relatórios com PDF anexado
app.use('/api/email', require('./routes/email'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sistema CCO API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Erro interno do servidor'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: true, message: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 5001;

// Função para verificar e adicionar colunas faltantes
const verificarEstruturaBanco = async () => {
  const db = require('./config/database');
  
  try {
    console.log('🔍 Verificando estrutura do banco de dados...');
    
    // Verificar se sla_nivel existe
    const checkSla = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='sla_nivel'
    `);
    
    if (checkSla.rows.length === 0) {
      console.log('📝 Adicionando coluna sla_nivel...');
      await db.query(`ALTER TABLE clientes ADD COLUMN sla_nivel VARCHAR(20) DEFAULT 'ALTO'`);
    }
    
    // Verificar se prioridade_1 existe
    const checkP1 = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='prioridade_1'
    `);
    
    if (checkP1.rows.length === 0) {
      console.log('📝 Adicionando coluna prioridade_1...');
      await db.query(`ALTER TABLE clientes ADD COLUMN prioridade_1 VARCHAR(20) DEFAULT 'WHATSAPP'`);
    }
    
    // Verificar se prioridade_2 existe
    const checkP2 = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='prioridade_2'
    `);
    
    if (checkP2.rows.length === 0) {
      console.log('📝 Adicionando coluna prioridade_2...');
      await db.query(`ALTER TABLE clientes ADD COLUMN prioridade_2 VARCHAR(20) DEFAULT 'LIGAÇÃO'`);
    }
    
    // Verificar se prioridade_3 existe
    const checkP3 = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='prioridade_3'
    `);
    
    if (checkP3.rows.length === 0) {
      console.log('📝 Adicionando coluna prioridade_3...');
      await db.query(`ALTER TABLE clientes ADD COLUMN prioridade_3 VARCHAR(20) DEFAULT 'E-MAIL'`);
    }
    
    // Verificar se ano_frota existe
    const checkAno = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='ano_frota'
    `);
    
    if (checkAno.rows.length === 0) {
      console.log('📝 Adicionando coluna ano_frota...');
      await db.query(`ALTER TABLE clientes ADD COLUMN ano_frota VARCHAR(50)`);
    }
    
    // Verificar se telefone existe
    const checkTelefone = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='telefone'
    `);
    
    if (checkTelefone.rows.length === 0) {
      console.log('📝 Adicionando coluna telefone...');
      await db.query(`ALTER TABLE clientes ADD COLUMN telefone VARCHAR(20)`);
    }
    
    // Verificar se nome_contato existe
    const checkNomeContato = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='nome_contato'
    `);
    
    if (checkNomeContato.rows.length === 0) {
      console.log('📝 Adicionando coluna nome_contato...');
      await db.query(`ALTER TABLE clientes ADD COLUMN nome_contato VARCHAR(100)`);
    }
    
    console.log('✅ Estrutura do banco verificada e atualizada');
  } catch (error) {
    console.log('⚠️ Aviso ao verificar banco:', error.message);
  }
};

// Inicializar servidor apenas em desenvolvimento
// Em produção (Vercel), o app é exportado e gerenciado pelo serverless
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend permitido: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    
    // Verificar e atualizar estrutura do banco
    await verificarEstruturaBanco();
  });
} else {
  // Em produção, apenas verificar estrutura
  verificarEstruturaBanco().catch(err => {
    console.error('Erro ao verificar estrutura do banco:', err);
  });
}

// Export para uso serverless (Vercel)
module.exports = app;
