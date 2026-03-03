const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Dados extraídos da imagem
const clientesContatos = [
  { nome: 'ACHÉ', nome_contato: 'Lima/Jasiane', contato: '(81) 99964-7277 / 98120-3525', email: 'silvandro.santos@ache.com.br / jasiane.silva@ache.com.br' },
  { nome: 'AMCOR', nome_contato: 'Ricardo', contato: '(81) 99114-8722', email: 'Ricardo.Barros@amcor.com' },
  { nome: 'JEEP', nome_contato: 'Douglas', contato: '(81) 99804-8387', email: 'douglas.duarte2@external.stellantis.com' },
  { nome: 'TECON', nome_contato: 'Valeria', contato: '(81) 98423-8350', email: 'VMorais@teconsuape.com / AAlcoforado@teconsuape.com' },
  { nome: 'PIACENTINI', nome_contato: 'Karlili Souza', contato: '(13) 99606-3998', email: 'karllili.ns@piacentinibrasil.com' },
  { nome: 'MERCADO LIVRE', nome_contato: 'Gilson', contato: '(81) 98752-2363', email: 'ext_brunalbu@mercadolivre.com' },
  { nome: 'CONSAG', nome_contato: 'Junior/Klehandro', contato: '(81) 98135-2350 / (31) 98328-8066', email: 'aldecirdes.junior@agnet.com.br' },
  { nome: 'CBA', nome_contato: 'Carlos', contato: '(81) 98190-2385', email: 'carlos.silva@cba.com.br' },
  { nome: 'VIVÁ/SOLAR', nome_contato: 'Juliana', contato: '(81) 98111-5772', email: 'dp@solarportodegalinhas.com.br' },
  { nome: 'CIMENTO FORTE', nome_contato: 'Edgard Fernandes', contato: '(81) 99998-2570 / (81) 3561-3515', email: 'edgard.ln@asanet.com.br' },
  { nome: 'CAMPARI', nome_contato: 'André Pereira', contato: '(81) 99286-5886', email: 'andre.pereira@campari.com' },
  { nome: 'CRISTAL PET', nome_contato: 'Telma', contato: '(81) 99113-2208', email: 'telma.ramos@envases.com.br' },
  { nome: 'VILA GALÉ', nome_contato: 'Janaina', contato: '(81) 97909-2273', email: 'cabo.rh@vilagale.com' },
  { nome: 'AMANCO', nome_contato: 'Luciana', contato: '(81) 98721-2891', email: 'luciana.lira@wavin.com' },
  { nome: '51 MULLER', nome_contato: 'Juliana', contato: '(81) 99618-7458', email: 'julianafreitas@ciamuller.com.br' },
  { nome: 'DECAL', nome_contato: 'Nicolly', contato: '(81) 3311-5965', email: 'nsilva@decalbrasil.com' },
  { nome: 'MARELLI', nome_contato: 'Gilvanice', contato: '(81) 98573-3404', email: 'gilvanice.silva@external.marelli.com / roney.rocha@marelli.com' },
  { nome: 'MONTE RODOVIAS', nome_contato: 'Robson', contato: '(81) 98160-3657', email: 'robson.lucena@monterodovias.com.br / deyse.silva@monterodovias.com.br' },
  { nome: 'MOURA', nome_contato: 'Janildo', contato: '(81) 98896-5728', email: 'janildo.possidonio@grupomoura.com' },
  { nome: 'MASTERFOODS', nome_contato: 'Pamela', contato: '(11) 96394-9798', email: 'pamela.vieira@effem.com' },
  { nome: 'ImBETTA', nome_contato: 'Karine', contato: '(81) 99164-5104', email: 'karine.pereira@sandene.com.br' },
  { nome: 'HDH', nome_contato: 'Sergio Ricardo', contato: '(81) 3183-0019 / (81) 98681-2087', email: 'hdh.recepcaoportaria@hdh.fpmf.org.br' },
  { nome: 'JCPM', nome_contato: 'Silvano', contato: '(81) 99497-4263', email: 'silvano.silva@jcpm.com.br' },
  { nome: 'OMIRP', nome_contato: 'Janaina', contato: '(81) 98793-4138', email: 'conceicaocpaiva@omirp.com.br' },
  { nome: 'CARREFOUR', nome_contato: 'Contato', contato: '(81) 3333-1111', email: 'contato@carrefour.com' },
  { nome: 'ECO RESORT', nome_contato: 'Contato', contato: '(81) 3335-6666', email: 'contato@ecoresort.com' },
];

async function atualizarClientes() {
  let sucessos = 0;
  let erros = 0;
  let naoEncontrados = 0;

  console.log('🚀 Iniciando atualização de contatos dos clientes...\n');

  for (const cliente of clientesContatos) {
    try {
      // Buscar o cliente pelo nome
      const busca = await pool.query(
        'SELECT id, nome FROM clientes WHERE UPPER(nome) LIKE $1',
        [`%${cliente.nome.toUpperCase()}%`]
      );

      if (busca.rows.length === 0) {
        console.log(`⚠️  Cliente "${cliente.nome}" não encontrado no banco`);
        naoEncontrados++;
        continue;
      }

      const clienteDb = busca.rows[0];

      // Atualizar o cliente
      await pool.query(
        `UPDATE clientes 
         SET nome_contato = $1, contato = $2, email = $3, updated_at = NOW()
         WHERE id = $4`,
        [cliente.nome_contato, cliente.contato, cliente.email, clienteDb.id]
      );

      console.log(`✅ Cliente "${clienteDb.nome}" atualizado: ${cliente.nome_contato} - ${cliente.contato}`);
      sucessos++;
    } catch (err) {
      console.error(`❌ Erro ao atualizar "${cliente.nome}":`, err.message);
      erros++;
    }
  }

  console.log('\n📊 Resumo da atualização:');
  console.log(`   ✅ Atualizados: ${sucessos}`);
  console.log(`   ⚠️  Não encontrados: ${naoEncontrados}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📋 Total processado: ${clientesContatos.length}`);

  await pool.end();
}

atualizarClientes().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
