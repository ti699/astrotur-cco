const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Banco de dados — pg Pool puro (sem Supabase)
const db = require('./config/database');

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
  // Domínio da VPS (altere para o domínio real após configurar o Nginx + SSL)
  // 'https://cco.astroturviagens.com.br',
  // 'https://www.cco.astroturviagens.com.br',
  // Manter o domínio Vercel do frontend enquanto não migrar o frontend
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
app.use('/api/empresas', require('./routes/empresas'));
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

// Health check — testa conexão real com o banco
app.get('/api/health', async (req, res) => {
  const dbOk = await db.testConnection().catch(() => false);
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
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

// Função para verificar e adicionar colunas faltantes (idempotente via IF NOT EXISTS)
const verificarEstruturaBanco = async () => {
  const checks = [
    `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sla_nivel VARCHAR(20) DEFAULT 'ALTO'`,
    `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS prioridade_1 VARCHAR(20) DEFAULT 'WHATSAPP'`,
    `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS prioridade_2 VARCHAR(20) DEFAULT 'LIGAÇÃO'`,
    `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS prioridade_3 VARCHAR(20) DEFAULT 'E-MAIL'`,
    `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ano_frota VARCHAR(50)`,
    `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)`,
    `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_contato VARCHAR(100)`,
    `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sla_requisitos TEXT`,
  ];

  console.log('🔍 Verificando estrutura do banco de dados...');
  for (const sql of checks) {
    await db.query(sql).catch((err) =>
      console.warn(`⚠️  Migration check falhou: ${err.message}`)
    );
  }
  console.log('✅ Estrutura do banco verificada');
};

// Inicializar servidor — roda em todos os ambientes (VPS, desenvolvimento)
app.listen(PORT, async () => {
  console.log(`🚀 CCO Backend rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend permitido: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

  // Verificar e atualizar estrutura do banco
  await verificarEstruturaBanco();
});

// Manter o export para testes automatizados (não quebra nada)
module.exports = app;
