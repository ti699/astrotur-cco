const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados usando as variáveis do .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Lista de clientes extraídos do arquivo de veículos
const clientes = [
  { nome: 'CARREFOUR', cnpj: '45543915000181', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'JEEP', cnpj: '59104422000155', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'CONSAG', cnpj: '08149811000155', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'CBA', cnpj: '33047538000115', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'PIACENTINI', cnpj: '61152932000109', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'VIVÁ/SOLAR', cnpj: '08467115000100', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'MERCADO LIVRE', cnpj: '10573521000191', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'TECON', cnpj: '07418535000182', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'MARELLI', cnpj: '49701071000127', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'ACHÉ', cnpj: '60659463000191', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'MASTERFOODS', cnpj: '00789323000120', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'CAMPARI', cnpj: '61066726000160', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'AMANCO', cnpj: '61156113000140', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'AMCOR', cnpj: '61156113000309', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'MONTE RODOVIAS', cnpj: '19645540000117', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'CIMENTO FORTE', cnpj: '07880765000140', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'ECO RESORT', cnpj: '10823605000121', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'JCPM', cnpj: '00882304000144', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'HDH', cnpj: '00882304000225', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'ImBETTA', cnpj: '08467115000291', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'CRISTAL PET', cnpj: '07418535000263', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: '51 MULLER', cnpj: '61066726000241', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'MOURA', cnpj: '10823605000202', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'DECAL', cnpj: '19645540000198', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'OMIRP', cnpj: '45543915000262', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'VILA GALÉ', cnpj: '49701071000208', contato: '', email: '', endereco: '', sla_horas: 2 },
  { nome: 'PREFEITURA IPO', cnpj: '11573521000172', contato: '', email: '', endereco: '', sla_horas: 2 },
];

async function inserirClientes() {
  let sucessos = 0;
  let erros = 0;
  let duplicados = 0;

  console.log('🚀 Iniciando inserção de clientes...\n');

  for (const cliente of clientes) {
    try {
      const result = await pool.query(
        `INSERT INTO clientes (nome, cnpj, contato, email, endereco, sla_horas)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nome`,
        [cliente.nome, cliente.cnpj, cliente.contato, cliente.email, cliente.endereco, cliente.sla_horas]
      );

      console.log(`✅ Cliente "${result.rows[0].nome}" inserido com sucesso (ID: ${result.rows[0].id})`);
      sucessos++;
    } catch (err) {
      if (err.code === '23505') {
        console.log(`⚠️  Cliente "${cliente.nome}" já existe (CNPJ duplicado)`);
        duplicados++;
      } else {
        console.error(`❌ Erro ao inserir "${cliente.nome}":`, err.message);
        erros++;
      }
    }
  }

  console.log('\n📊 Resumo da importação:');
  console.log(`   ✅ Inseridos: ${sucessos}`);
  console.log(`   ⚠️  Duplicados: ${duplicados}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📋 Total processado: ${clientes.length}`);

  await pool.end();
}

inserirClientes().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
