const db = require('../config/database');
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
  const { rows } = await db.query(
    `SELECT id FROM tipos_quebra WHERE nome ILIKE $1 LIMIT 1`,
    [natureza]
  );
  return rows[0]?.id ?? null;
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
      empresa_id: req.user.empresa_id,
    };

    // 5. Inserir no PostgreSQL
    const cols = Object.keys(dadosInsert);
    const vals = Object.values(dadosInsert);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await db.query(
      `INSERT INTO ocorrencias (${cols.join(', ')})
       VALUES (${placeholders})
       RETURNING id, numero, tipo_ocorrencia, status`,
      vals
    );

    const data = rows[0];
    if (!data) throw new Error('Falha ao inserir ocorrência');

    console.log(`✅ Ocorrência ${data.numero} criada com sucesso`);

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
    const { rows } = await db.query(
      `UPDATE ocorrencias SET status = $1 WHERE id = $2 AND empresa_id = $3 RETURNING id, status`,
      [status, id, req.user.empresa_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: `Ocorrencia ${id} nao encontrada.` });
    }

    const data = rows[0];
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
  const existsResult = await db.query(`SELECT id FROM ocorrencias WHERE id = $1 AND empresa_id = $2`, [id, req.user.empresa_id]);
  if (existsResult.rows.length === 0) {
    return res.status(404).json({ erro: 'Ocorrencia nao encontrada' });
  }

  // 3. Nome único para o arquivo
  const extensao = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
  const nomeArquivo = `${id}_${Date.now()}.${extensao}`;
  const uploadsDir = path.join(__dirname, '../uploads/fotos');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const caminhoLocal = path.join(uploadsDir, nomeArquivo);

  // 4. Salvar arquivo localmente (VPS)
  fs.writeFileSync(caminhoLocal, req.file.buffer);

  // URL relativa acessível via Nginx (configure static files em /api/uploads)
  const urlPublica = `/uploads/fotos/${nomeArquivo}`;

  // 5. Persistir URL na ocorrência
  const { rows: updRows } = await db.query(
    `UPDATE ocorrencias SET socorro_foto_url = $1 WHERE id = $2 AND empresa_id = $3 RETURNING id, socorro_foto_url`,
    [urlPublica, id, req.user.empresa_id]
  );

  if (updRows.length === 0) {
    return res.status(500).json({ erro: 'Erro ao salvar URL da foto' });
  }

  console.log(`✅ Foto da ocorrência ${id} salva: ${urlPublica}`);
  return res.status(200).json(updRows[0]);
}

// ─── Gerar PDF da OS de Socorro ──────────────────────────────────────────────
async function gerarOsPdf(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido.' });

  // 1. Buscar ocorrência com relacionamentos
  const { rows: occRows } = await db.query(`
    SELECT
      o.*,
      json_build_object('nome', c.nome) AS clientes,
      json_build_object('nome', u.nome) AS usuarios
    FROM ocorrencias o
    LEFT JOIN clientes c ON c.id = o.cliente_id
    LEFT JOIN usuarios u ON u.id = o.monitor_id
    WHERE o.id = $1 AND o.empresa_id = $2
  `, [id, req.user.empresa_id]);

  if (occRows.length === 0) {
    return res.status(404).json({ erro: 'Ocorrência não encontrada.' });
  }

  const ocorrencia = occRows[0];

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

  const conditions = [`o.empresa_id = $1`];
  const params = [req.user.empresa_id];
  let p = 2;

  if (status.length === 1)       { conditions.push(`o.status = $${p++}`); params.push(status[0]); }
  else if (status.length > 1)    { conditions.push(`o.status = ANY($${p++})`); params.push(status); }

  if (tipos.length === 1)        { conditions.push(`o.tipo_ocorrencia = $${p++}`); params.push(tipos[0]); }
  else if (tipos.length > 1)     { conditions.push(`o.tipo_ocorrencia = ANY($${p++})`); params.push(tipos); }

  if (clientes.length === 1)     { conditions.push(`o.cliente_id = $${p++}`); params.push(clientes[0]); }
  else if (clientes.length > 1)  { conditions.push(`o.cliente_id = ANY($${p++})`); params.push(clientes); }

  if (monitores.length === 1)    { conditions.push(`o.monitor_id = $${p++}`); params.push(monitores[0]); }
  else if (monitores.length > 1) { conditions.push(`o.monitor_id = ANY($${p++})`); params.push(monitores); }

  if (dataInicio) { conditions.push(`o.data_chamado >= $${p++}`); params.push(`${dataInicio}T00:00:00`); }
  if (dataFim)    { conditions.push(`o.data_chamado <= $${p++}`); params.push(`${dataFim}T23:59:59`); }
  if (busca)      { conditions.push(`o.descricao ILIKE $${p++}`); params.push(`%${busca}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await db.query(`
      SELECT
        o.id, o.numero, o.status, o.tipo_ocorrencia,
        o.descricao, o.veiculo_previsto, o.data_chamado,
        o.data_conclusao, o.houve_atraso, o.atraso_minutos,
        o.socorro_rota, o.created_at,
        json_build_object('id', c.id, 'nome', c.nome) AS clientes,
        json_build_object('id', u.id, 'nome', u.nome) AS usuarios,
        COUNT(*) OVER() AS total_count
      FROM ocorrencias o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN usuarios u ON u.id = o.monitor_id
      ${where}
      ORDER BY o.data_chamado DESC
      LIMIT $${p++} OFFSET $${p++}
    `, [...params, limite, offset]);

    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const dados = rows.map(({ total_count, ...rest }) => rest);

    return res.status(200).json({
      dados,
      paginacao: { total, pagina, limite, paginas: Math.ceil(total / limite) },
      filtros_aplicados: {
        status:      status.length   ? status      : null,
        tipos:       tipos.length    ? tipos       : null,
        clientes:    clientes.length ? clientes    : null,
        monitores:   monitores.length? monitores   : null,
        data_inicio: dataInicio      ? dataInicio  : null,
        data_fim:    dataFim         ? dataFim     : null,
        busca:       busca           ? busca       : null
      }
    });
  } catch (err) {
    console.error('❌ Erro ao listar ocorrências:', err);
    return res.status(500).json({ erro: err.message });
  }
}

module.exports = { criarOcorrencia, listarOcorrencias, atualizarAndamento, uploadFoto, gerarOsPdf };
