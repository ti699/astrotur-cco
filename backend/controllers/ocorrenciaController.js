const { supabase } = require('../config/supabase');
const { validarOcorrencia } = require('../validators/ocorrenciaValidator');
const path = require('path');
const fs = require('fs');

// ─── Gerador de número único de ocorrência ─────────────────────────────────
const ID_FILE = path.join(__dirname, '../data/ocorrencia_counter.json');

function loadIdCounter() {
  try {
    if (fs.existsSync(ID_FILE)) {
      return JSON.parse(fs.readFileSync(ID_FILE, 'utf8'));
    }
  } catch { /* ignora */ }
  return { lastDate: '', counter: 0 };
}

function saveIdCounter(data) {
  try {
    fs.mkdirSync(path.dirname(ID_FILE), { recursive: true });
    fs.writeFileSync(ID_FILE, JSON.stringify(data, null, 2));
  } catch { /* ignora */ }
}

function gerarNumeroOcorrencia() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dataChave = hoje.toISOString().split('T')[0];

  let counter = loadIdCounter();
  if (counter.lastDate !== dataChave) {
    counter = { lastDate: dataChave, counter: 0 };
  }
  counter.counter += 1;
  saveIdCounter(counter);

  return `${dia}/${mes}-${String(counter.counter).padStart(4, '0')}`;
}

// ─── Mapear socorro_natureza_defeito → tipo_quebra_id ──────────────────────
async function resolverTipoQuebraId(natureza) {
  if (!natureza) return null;
  const { data } = await supabase
    .from('tipos_quebra')
    .select('id')
    .ilike('nome', natureza)
    .limit(1);
  return data && data[0] ? data[0].id : null;
}

// ─── Controller principal ──────────────────────────────────────────────────
/**
 * POST /api/ocorrencias
 */
async function criarOcorrencia(req, res) {
  // 1. Validação
  const validacao = validarOcorrencia(req.body);
  if (!validacao.valido) {
    return res.status(422).json({
      erro: validacao.mensagem,
      campos: validacao.campos,
    });
  }

  try {
    const {
      tipo_ocorrencia,
      cliente_id,
      monitor_id,
      data_hora,
      veiculo_previsto,
      veiculo_substituto,
      horario_inicio_socorro,
      horario_fim_socorro,
      houve_atraso,
      atraso_minutos,
      status,
      descricao,
      observacoes_texto,
      // Campos de socorro
      socorro_turno,
      socorro_motorista,
      socorro_rota,
      socorro_natureza_defeito,
      socorro_houve_troca,
      socorro_carro_reserva,
      socorro_tipo_atendimento,
      socorro_foto_url,
    } = req.body;

    // 2. Resolver tipo_quebra_id a partir da natureza do defeito (apenas para Socorro)
    const tipoQuebraId =
      tipo_ocorrencia === 'Socorro'
        ? await resolverTipoQuebraId(socorro_natureza_defeito)
        : null;

    // 3. Gerar número da ocorrência
    const numero = gerarNumeroOcorrencia();

    // 4. Montar objeto de inserção — Status em uppercase para consistência
    const dadosInsert = {
      numero,
      cliente_id: parseInt(cliente_id),
      monitor_id: monitor_id ? parseInt(monitor_id) : null,
      tipo_quebra_id: tipoQuebraId,
      tipo_ocorrencia,
      data_quebra: data_hora,
      data_chamado: new Date().toISOString(),
      descricao: String(descricao).trim(),
      status: status.toUpperCase().replace(' ', '_'), // Ex: "Em andamento" → "EM_ANDAMENTO"
      veiculo_previsto: veiculo_previsto || null,
      veiculo_substituto: veiculo_substituto || null,
      horario_inicio_socorro: horario_inicio_socorro || null,
      horario_fim_socorro: horario_fim_socorro || null,
      houve_atraso: houve_atraso === true || houve_atraso === 'true',
      atraso_minutos: atraso_minutos ? parseInt(atraso_minutos) : null,
      observacoes_texto: observacoes_texto || null,
      observacoes: null, // Não gravar mais JSON aqui
      // Campos de socorro (null para outros tipos)
      socorro_turno: tipo_ocorrencia === 'Socorro' ? socorro_turno : null,
      socorro_motorista: tipo_ocorrencia === 'Socorro' ? socorro_motorista : null,
      socorro_rota: tipo_ocorrencia === 'Socorro' ? socorro_rota : null,
      socorro_natureza_defeito: tipo_ocorrencia === 'Socorro' ? socorro_natureza_defeito : null,
      socorro_houve_troca:
        tipo_ocorrencia === 'Socorro'
          ? socorro_houve_troca === true || socorro_houve_troca === 'true'
          : false,
      socorro_carro_reserva: tipo_ocorrencia === 'Socorro' ? socorro_carro_reserva : null,
      socorro_tipo_atendimento: tipo_ocorrencia === 'Socorro' ? socorro_tipo_atendimento : null,
      socorro_foto_url: socorro_foto_url || null,
    };

    // 5. Inserir no Supabase
    const { data, error } = await supabase
      .from('ocorrencias')
      .insert(dadosInsert)
      .select('id, numero, tipo_ocorrencia, status')
      .single();

    if (error) {
      console.error('❌ Erro Supabase ao criar ocorrência:', error);
      return res.status(500).json({ erro: error.message });
    }

    console.log(`✅ Ocorrência ${data.numero} criada com sucesso via Supabase`);

    // 6. Resposta 201
    return res.status(201).json({
      id: data.id,
      tipo_ocorrencia: data.tipo_ocorrencia,
      status: data.status,
    });
  } catch (err) {
    console.error('❌ Erro inesperado em criarOcorrencia:', err);
    return res.status(500).json({ erro: err.message });
  }
}

module.exports = { criarOcorrencia };
