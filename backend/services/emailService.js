'use strict';

const nodemailer = require('nodemailer');
const puppeteer  = require('puppeteer');
const { supabase } = require('../config/supabase'); // disponível se necessário em extensões futuras

// ─── transporter singleton ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verifica a conexão SMTP ao carregar o módulo
transporter.verify((error) => {
  if (error) {
    console.warn('[emailService] ⚠️ Conexão SMTP indisponível:', error.message);
  } else {
    console.log('[emailService] ✅ Conexão SMTP OK');
  }
});

// ─── gerar PDF via Puppeteer ──────────────────────────────────────────────────
async function gerarPdfBuffer(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

// ─── template HTML do relatório (vai para o PDF) ─────────────────────────────
function gerarHtmlRelatorioPortaria(dados, filtros) {
  const agora = new Date().toLocaleString('pt-BR');

  const linhas = dados.map(m => `
    <tr>
      <td>${m.data_hora ? new Date(m.data_hora).toLocaleString('pt-BR') : '—'}</td>
      <td class="${m.tipo_movimento === 'ENTRADA' ? 'badge-entrada' : 'badge-saida'}">${m.tipo_movimento || '—'}</td>
      <td>${m.veiculos?.numero_frota || '—'} — ${m.veiculos?.placa || '—'}</td>
      <td>${m.motoristas?.nome || '—'}</td>
      <td>${m.usuarios?.nome || '—'}</td>
      <td>${m.clientes?.nome || '—'}</td>
      <td>${m.km_entrada ?? '—'}</td>
      <td>${m.destino || m.local_saida || '—'}</td>
    </tr>
  `).join('');

  const blocoFiltros = filtros ? `
  <div class="filtros">
    <strong>Filtros aplicados:</strong>
    ${filtros.data_inicio ? `Data início: ${filtros.data_inicio}` : ''}
    ${filtros.data_fim    ? `| Data fim: ${filtros.data_fim}` : ''}
    ${filtros.tipo_movimento?.length ? `| Tipo: ${filtros.tipo_movimento.join(', ')}` : ''}
    ${filtros.cliente_id?.length     ? `| Clientes: ${filtros.cliente_id.join(', ')}` : ''}
    ${filtros.monitor_id?.length     ? `| Monitores: ${filtros.monitor_id.join(', ')}` : ''}
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
    h1   { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; }
    .subtitulo { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    .filtros { background: #f1f5f9; padding: 8px 12px; border-radius: 4px;
               margin-bottom: 16px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th  { background: #1e3a5f; color: white; padding: 6px 8px;
          text-align: left; font-size: 11px; }
    td  { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .rodape { margin-top: 16px; font-size: 10px; color: #94a3b8; text-align: right; }
    .badge-entrada { color: #15803d; font-weight: bold; }
    .badge-saida   { color: #b45309; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Relatório de Movimentações — Portaria</h1>
  <div class="subtitulo">Gerado em ${agora} • Total de registros: ${dados.length}</div>
  ${blocoFiltros}
  <table>
    <thead>
      <tr>
        <th>Data/Hora</th><th>Tipo</th><th>Veículo</th><th>Motorista</th>
        <th>Monitor</th><th>Cliente</th><th>KM</th><th>Destino/Local</th>
      </tr>
    </thead>
    <tbody>
      ${linhas.length
        ? linhas
        : '<tr><td colspan="8" style="text-align:center;color:#94a3b8">Nenhum registro encontrado</td></tr>'}
    </tbody>
  </table>
  <div class="rodape">ASTROTUR — Sistema de Portaria</div>
</body>
</html>`;
}

// ─── template HTML do corpo do e-mail (resumo em cards) ──────────────────────
function gerarHtmlCorpoEmail(dados, filtros, nomeDestinatario) {
  const agora    = new Date().toLocaleString('pt-BR');
  const entradas = dados.filter(m => m.tipo_movimento === 'ENTRADA').length;
  const saidas   = dados.filter(m => m.tipo_movimento === 'SAIDA').length;

  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#1e3a5f;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:18px">Relatório de Portaria</h1>
    <p style="color:#93c5fd;margin:4px 0 0;font-size:12px">Gerado em ${agora}</p>
  </div>

  <div style="background:#f8fafc;padding:20px 24px;border:1px solid #e2e8f0">
    ${nomeDestinatario ? `<p>Olá, <strong>${nomeDestinatario}</strong></p>` : '<p>Olá,</p>'}
    <p>Segue em anexo o relatório de movimentações da portaria.</p>

    <div style="display:flex;gap:12px;margin:16px 0">
      <div style="flex:1;background:white;border:1px solid #e2e8f0;
                  border-radius:6px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:bold;color:#1e3a5f">${dados.length}</div>
        <div style="font-size:11px;color:#64748b">Total de registros</div>
      </div>
      <div style="flex:1;background:white;border:1px solid #e2e8f0;
                  border-radius:6px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:bold;color:#15803d">${entradas}</div>
        <div style="font-size:11px;color:#64748b">Entradas</div>
      </div>
      <div style="flex:1;background:white;border:1px solid #e2e8f0;
                  border-radius:6px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:bold;color:#b45309">${saidas}</div>
        <div style="font-size:11px;color:#64748b">Saídas</div>
      </div>
    </div>

    <p style="font-size:12px;color:#64748b">
      O relatório completo está disponível no PDF em anexo.
    </p>
  </div>

  <div style="background:#f1f5f9;padding:12px 24px;border-radius:0 0 8px 8px;
              border:1px solid #e2e8f0;border-top:none;font-size:10px;color:#94a3b8">
    ASTROTUR — Sistema de Portaria • E-mail gerado automaticamente
  </div>
</div>`;
}

// ─── função principal ─────────────────────────────────────────────────────────
/**
 * Envia um relatório de portaria por e-mail com PDF anexado.
 *
 * @param {object}   opcoes
 * @param {string[]} opcoes.destinatarios     - array de e-mails
 * @param {string}   [opcoes.assunto]         - assunto do e-mail
 * @param {object[]} opcoes.dados             - registros do relatório
 * @param {object}   [opcoes.filtros]         - filtros aplicados (exibidos no relatório)
 * @param {string}   [opcoes.nomeDestinatario] - nome para o cumprimento
 */
async function enviarRelatorio({ destinatarios, assunto, dados, filtros, nomeDestinatario }) {
  // validar destinatários
  if (!destinatarios?.length) {
    throw new Error('Pelo menos um destinatário é obrigatório');
  }

  const emailsValidos = destinatarios.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (!emailsValidos.length) {
    throw new Error('Nenhum e-mail válido fornecido');
  }

  // 1. HTML do relatório completo → PDF
  const htmlRelatorio = gerarHtmlRelatorioPortaria(dados ?? [], filtros);
  const pdfBuffer     = await gerarPdfBuffer(htmlRelatorio);
  console.log('[emailService] PDF gerado, tamanho:', pdfBuffer.length, 'bytes');

  // 2. HTML do corpo do e-mail (resumo)
  const htmlCorpo = gerarHtmlCorpoEmail(dados ?? [], filtros, nomeDestinatario);

  // 3. enviar
  const info = await transporter.sendMail({
    from:    `"ASTROTUR Portaria" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to:      emailsValidos.join(', '),
    subject: assunto || 'Relatório de Movimentações — Portaria',
    html:    htmlCorpo,
    attachments: [
      {
        filename:    `relatorio_portaria_${new Date().toISOString().slice(0, 10)}.pdf`,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  console.log('[emailService] ✅ E-mail enviado:', info.messageId);
  return { messageId: info.messageId, destinatarios: emailsValidos };
}

module.exports = { enviarRelatorio };
