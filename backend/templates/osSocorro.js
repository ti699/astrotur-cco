'use strict';

/**
 * Template HTML da O.S. de Socorro Manutenção
 * Recebe o objeto da ocorrência retornado pelo Supabase e gera o HTML completo.
 */

function gerarHtmlOS(o) {
  const data = o.horario_inicio_socorro
    ? new Date(o.horario_inicio_socorro).toLocaleDateString('pt-BR')
    : new Date(o.created_at).toLocaleDateString('pt-BR');

  const hora = o.horario_inicio_socorro
    ? new Date(o.horario_inicio_socorro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const horaFim = o.horario_fim_socorro
    ? new Date(o.horario_fim_socorro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const check = (condicao) => condicao
    ? '<td class="cb">X</td>'
    : '<td class="cb">&nbsp;</td>';

  const natureza = o.socorro_natureza_defeito || '';

  const monitorNome = o.usuarios?.nome || o.usuarios?.[0]?.nome || '—';
  const clienteNome = o.clientes?.nome || o.clientes?.[0]?.nome || '—';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      padding: 20px;
      color: #000;
    }

    /* CABEÇALHO */
    .header {
      display: flex;
      align-items: center;
      border-bottom: 2px solid #1565C0;
      padding-bottom: 8px;
      margin-bottom: 6px;
    }
    .logo {
      font-size: 22px;
      font-weight: bold;
      color: #1565C0;
      width: 160px;
      flex-shrink: 0;
      letter-spacing: 1px;
    }
    .logo span { color: #e53935; }
    .titulo {
      flex: 1;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
    }

    /* META ROW */
    .meta-row {
      display: flex;
      border: 1px solid #ccc;
      font-size: 10px;
      margin-bottom: 8px;
    }
    .meta-row div {
      padding: 3px 8px;
      border-right: 1px solid #ccc;
      flex: 1;
    }
    .meta-row div:last-child { border-right: none; flex: 3; }

    /* LINHA DE DADOS */
    .data-row {
      display: flex;
      border: 1px solid #000;
      margin-bottom: 4px;
    }
    .data-cell {
      padding: 4px 8px;
      border-right: 1px solid #000;
      flex: 1;
    }
    .data-cell:last-child { border-right: none; }
    .data-cell label {
      font-weight: bold;
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      color: #333;
    }
    .data-cell span {
      font-size: 12px;
      display: block;
    }

    /* CORPO */
    .body-section {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      min-height: 220px;
    }
    .left-col { width: 210px; flex-shrink: 0; }
    .right-col { flex: 1; }

    /* TIPO DE SOCORRO */
    .section-title {
      font-weight: bold;
      font-size: 10px;
      text-transform: uppercase;
      background: #e8e8e8;
      padding: 2px 6px;
      margin-bottom: 0;
      border: 1px solid #000;
      border-bottom: none;
    }
    .check-table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
    .check-table td {
      border: 1px solid #000;
      padding: 3px 6px;
      font-size: 11px;
    }
    .check-table td.cb {
      width: 40px;
      text-align: center;
      font-weight: bold;
      background: #f9f9f9;
    }

    /* DESCRIÇÃO */
    .desc-title {
      font-weight: bold;
      font-size: 10px;
      text-transform: uppercase;
      background: #e8e8e8;
      padding: 2px 6px;
      border: 1px solid #000;
      border-bottom: none;
    }
    .descricao-box {
      border: 1px solid #000;
      min-height: 155px;
      padding: 8px;
      font-size: 11px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .atendimento-row {
      display: flex;
      justify-content: space-around;
      border: 1px solid #000;
      border-top: none;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: bold;
    }

    /* FOTO */
    .foto-section {
      margin-top: 14px;
      text-align: center;
      border: 1px solid #ccc;
      padding: 8px;
    }
    .foto-section p {
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .foto-section img {
      max-width: 300px;
      max-height: 200px;
      border: 1px solid #ccc;
    }

    /* RODAPÉ */
    .footer {
      margin-top: 28px;
      border-top: 2px solid #000;
      display: flex;
      padding-top: 8px;
      gap: 20px;
    }
    .footer-col {
      flex: 1;
      text-align: center;
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
    }
    .footer-col .assinatura-linha {
      border-top: 1px solid #000;
      margin-top: 36px;
      padding-top: 4px;
      font-size: 9px;
      font-weight: normal;
      text-transform: none;
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="logo">A<span>STRO</span>TUR</div>
    <div class="titulo">O.S. de Socorro Manutenção</div>
  </div>

  <!-- META -->
  <div class="meta-row">
    <div><strong>Código:</strong> ${o.numero || '—'}</div>
    <div><strong>Data:</strong> ${data}</div>
    <div><strong>Aprovado por:</strong> ${o.aprovador || '—'}</div>
    <div><strong>Revisão:</strong> Documento gerado automaticamente pelo sistema.</div>
  </div>

  <!-- LINHA 1: DATA | HORA INÍCIO | HORA FIM | TURNO | MONITOR -->
  <div class="data-row">
    <div class="data-cell"><label>Data</label><span>${data}</span></div>
    <div class="data-cell"><label>Hora Início</label><span>${hora}</span></div>
    <div class="data-cell"><label>Hora Fim</label><span>${horaFim}</span></div>
    <div class="data-cell"><label>Turno</label><span>${o.socorro_turno || '—'}</span></div>
    <div class="data-cell"><label>Monitor</label><span>${monitorNome}</span></div>
  </div>

  <!-- LINHA 2: VEÍCULO | MOTORISTA | CLIENTE | ROTA -->
  <div class="data-row">
    <div class="data-cell"><label>Veículo</label><span>${o.veiculo_previsto || '—'}</span></div>
    <div class="data-cell"><label>Motorista</label><span>${o.socorro_motorista || '—'}</span></div>
    <div class="data-cell"><label>Cliente</label><span>${clienteNome}</span></div>
    <div class="data-cell"><label>Rota</label><span>${o.socorro_rota || '—'}</span></div>
  </div>

  <!-- CORPO -->
  <div class="body-section">

    <!-- COLUNA ESQUERDA -->
    <div class="left-col">
      <div class="section-title">Tipo de Socorro:</div>
      <table class="check-table">
        <tr><td>Mecânico</td>${check(natureza === 'Mecanico' || natureza === 'Mecânico')}</tr>
        <tr><td>Elétrico</td>${check(natureza === 'Eletrico' || natureza === 'Elétrico')}</tr>
        <tr><td>Pneu</td>${check(natureza === 'Pneu')}</tr>
        <tr><td>Pane Seca</td>${check(natureza === 'Pane Seca')}</tr>
        <tr><td>Avaria</td>${check(natureza === 'Avaria')}</tr>
        <tr><td>Outros</td>${check(natureza !== '' && !['Mecanico','Mecânico','Eletrico','Elétrico','Pneu','Pane Seca','Avaria'].includes(natureza))}</tr>
      </table>

      <div class="section-title">Houve Troca?</div>
      <table class="check-table">
        <tr><td>Sim</td>${check(o.socorro_houve_troca === true || o.socorro_houve_troca === 'true')}</tr>
        <tr><td>Não</td>${check(o.socorro_houve_troca === false || o.socorro_houve_troca === 'false' || o.socorro_houve_troca === null)}</tr>
      </table>

      <div class="section-title">Carro Reserva:</div>
      <table class="check-table">
        <tr><td style="font-weight:bold; font-size:12px">${o.socorro_carro_reserva || '—'}</td></tr>
      </table>
    </div>

    <!-- COLUNA DIREITA -->
    <div class="right-col">
      <div class="desc-title">Descrição do Socorro</div>
      <div class="descricao-box">${(o.descricao || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <div class="atendimento-row">
        <span>ATENDIMENTO &nbsp;(${o.socorro_tipo_atendimento === 'Atendimento local' ? '&nbsp;X&nbsp;' : '&nbsp;&nbsp;&nbsp;'})</span>
        <span>SOCORRO / REMOÇÃO &nbsp;(${o.socorro_tipo_atendimento === 'Socorro (remocao)' || o.socorro_tipo_atendimento === 'Socorro (remoção)' ? '&nbsp;X&nbsp;' : '&nbsp;&nbsp;&nbsp;'})</span>
      </div>
    </div>

  </div>

  <!-- FOTO (se existir) -->
  ${o.socorro_foto_url ? `
  <div class="foto-section">
    <p>Foto da Ocorrência</p>
    <img src="${o.socorro_foto_url}" alt="Foto da ocorrência" />
  </div>` : ''}

  <!-- RODAPÉ -->
  <div class="footer">
    <div class="footer-col">
      Tráfego
      <div class="assinatura-linha">Assinatura / Data</div>
    </div>
    <div class="footer-col">
      Hora do Recebimento / Assinatura da Manutenção
      <div class="assinatura-linha">Assinatura / Data</div>
    </div>
  </div>

</body>
</html>`;
}

module.exports = { gerarHtmlOS };
