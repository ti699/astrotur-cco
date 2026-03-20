const { supabase } = require('../config/supabase');
const { validarOcorrencia } = require('../validators/ocorrenciaValidator');
const { gerarCodigoSocorro } = require('../services/codigoSocorroService');
const { gerarHtmlOS } = require('../templates/osSocorro');
const puppeteer = require('puppeteer');
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
    //    Socorro → padrão ASTRO.TRF.XXX-D (sequencial mensal, concurrency-safe)
    //    Demais  → padrão DD/MM-NNNN (sequencial diário por arquivo)
    const numero =
      tipo_ocorrencia === 'Socorro'
        ? await gerarCodigoSocorro()
        : gerarNumeroOcorrencia();

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

// ─── Status permitidos ─────────────────────────────────────────────────────
const STATUS_ANDAMENTO_VALIDOS = ['Pendente', 'Em andamento', 'Concluido'];

/**
 * PATCH /api/ocorrencias/:id/andamento
 * Altera apenas o campo status da ocorrência.
 */
async function atualizarAndamento(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ erro: 'Parâmetro :id inválido.' });
  }

  const { status } = req.body;

  if (!status || !STATUS_ANDAMENTO_VALIDOS.includes(status)) {
    return res.status(422).json({
      erro: 'Campo status inválido.',
      valores_aceitos: STATUS_ANDAMENTO_VALIDOS,
    });
  }

  try {
    const { data, error } = await supabase
      .from('ocorrencias')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      // PGRST116 → nenhuma linha encontrada
      if (error.code === 'PGRST116') {
        return res.status(404).json({ erro: `Ocorrência ${id} não encontrada.` });
      }
      console.error('❌ Erro Supabase ao atualizar andamento:', error);
      return res.status(500).json({ erro: error.message });
    }

    console.log(`✅ Ocorrência ${id} — status atualizado para "${data.status}"`);

    return res.status(200).json({ id: data.id, status: data.status });
  } catch (err) {
    console.error('❌ Erro inesperado em atualizarAndamento:', err);
    return res.status(500).json({ erro: err.message });
  }
}

// ─── Upload de foto ────────────────────────────────────────────────────────
/**
 * POST /api/ocorrencias/:id/foto
 * Recebe um arquivo via multipart/form-data (campo: foto),
 * faz upload para o Supabase Storage e salva a URL pública em
 * ocorrencias.socorro_foto_url.
 */
async function uploadFoto(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ erro: 'Parâmetro :id inválido.' });
  }

  // 1. Arquivo presente?
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado. Campo esperado: foto' });
  }

  // 2. Ocorrência existe?
  const { data: existente, error: erroGet } = await supabase
    .from('ocorrencias')
    .select('id')
    .eq('id', id)
    .single();

  if (erroGet || !existente) {
    return res.status(404).json({ erro: 'Ocorrência não encontrada' });
  }

  // 3. Nome único para o arquivo
  const extensao = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
  const nomeArquivo = `${id}_${Date.now()}.${extensao}`;
  const caminho = `fotos/${nomeArquivo}`;

  // 4. Upload para Supabase Storage
  const { error: erroUpload } = await supabase
    .storage
    .from('ocorrencias-fotos')
    .upload(caminho, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });

  if (erroUpload) {
    console.error('❌ Erro Supabase Storage:', erroUpload);
    return res.status(500).json({ erro: erroUpload.message });
  }

  // 5. URL pública
  const { data: urlData } = supabase
    .storage
    .from('ocorrencias-fotos')
    .getPublicUrl(caminho);

  const urlPublica = urlData.publicUrl;

  // 6. Persistir URL na ocorrência
  const { data, error: erroUpdate } = await supabase
    .from('ocorrencias')
    .update({ socorro_foto_url: urlPublica })
    .eq('id', id)
    .select('id, socorro_foto_url')
    .single();

  if (erroUpdate) {
    console.error('❌ Erro Supabase ao salvar URL:', erroUpdate);
    return res.status(500).json({ erro: erroUpdate.message });
  }

  console.log(`✅ Foto da ocorrência ${id} salva: ${urlPublica}`);
  return res.status(200).json(data);
}

// ─── Gerar PDF da OS de Socorro ──────────────────────────────────────────────
async function gerarOsPdf(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido.' });

  // 1. Buscar ocorrência com relacionamentos
  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select(`
      *,
      clientes!cliente_id ( nome ),
      usuarios!monitor_id ( nome )
    `)
    .eq('id', id)
    .single();

  if (error || !ocorrencia) {
    return res.status(404).json({ erro: 'Ocorrência não encontrada.' });
  }

  if (ocorrencia.tipo_ocorrencia !== 'Socorro') {
    return res.status(422).json({
      erro: `Tipo de ocorrência inválido: "${ocorrencia.tipo_ocorrencia}". Apenas ocorrências do tipo "Socorro" geram O.S.`
    });
  }

  // 2. Gerar HTML
  const html = gerarHtmlOS(ocorrencia);

  // 3. Gerar PDF com Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' }
    });
    await browser.close();

    const filename = `OS_Socorro_${ocorrencia.numero || id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(pdfBuffer);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('❌ Erro ao gerar PDF:', err);
    return res.status(500).json({ erro: 'Erro interno ao gerar PDF.', detalhe: err.message });
  }
}

// ─── Listar ocorrências com filtros combinados ───────────────────────────────
async function listarOcorrencias(req, res) {
  const { toArray, toArrayInt, parsePagination } = require('../utils/queryHelpers');

  const status    = toArray(req.query.status);
  const tipos     = toArray(req.query.tipo);
  const clientes  = toArrayInt(req.query.cliente_id);
  const monitores = toArrayInt(req.query.monitor_id);
  const busca      = req.query.busca     || null;
  const dataInicio = req.query.data_inicio || null;
  const dataFim    = req.query.data_fim    || null;

  const { pagina, limite, offset } = parsePagination(req.query);

  let query = supabase
    .from('ocorrencias')
    .select(`
      id,
      numero,
      status,
      tipo_ocorrencia,
      descricao,
      veiculo_previsto,
      data_chamado,
      data_conclusao,
      houve_atraso,
      atraso_minutos,
      socorro_rota,
      created_at,
      clientes!cliente_id ( id, nome ),
      usuarios!monitor_id ( id, nome )
    `, { count: 'exact' })
    .order('data_chamado', { ascending: false })
    .range(offset, offset + limite - 1);

  if (status.length === 1)       query = query.eq('status', status[0]);
  else if (status.length > 1)   query = query.in('status', status);

  if (tipos.length === 1)        query = query.eq('tipo_ocorrencia', tipos[0]);
  else if (tipos.length > 1)    query = query.in('tipo_ocorrencia', tipos);

  if (clientes.length === 1)     query = query.eq('cliente_id', clientes[0]);
  else if (clientes.length > 1) query = query.in('cliente_id', clientes);

  if (monitores.length === 1)    query = query.eq('monitor_id', monitores[0]);
  else if (monitores.length > 1) query = query.in('monitor_id', monitores);

  if (dataInicio) query = query.gte('data_chamado', `${dataInicio}T00:00:00`);
  if (dataFim)    query = query.lte('data_chamado', `${dataFim}T23:59:59`);
  if (busca)      query = query.ilike('descricao', `%${busca}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ Erro ao listar ocorrências:', error);
    return res.status(500).json({ erro: error.message });
  }

  return res.status(200).json({
    dados: data ?? [],
    paginacao: {
      total:   count ?? 0,
      pagina,
      limite,
      paginas: Math.ceil((count ?? 0) / limite)
    },
    filtros_aplicados: {
      status:      status.length      ? status      : null,
      tipos:       tipos.length       ? tipos       : null,
      clientes:    clientes.length    ? clientes    : null,
      monitores:   monitores.length   ? monitores   : null,
      data_inicio: dataInicio         ? dataInicio  : null,
      data_fim:    dataFim            ? dataFim     : null,
      busca:       busca              ? busca       : null
    }
  });
}

module.exports = { criarOcorrencia, listarOcorrencias, atualizarAndamento, uploadFoto, gerarOsPdf };
