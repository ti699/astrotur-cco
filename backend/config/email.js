const nodemailer = require('nodemailer');

// Configuração do transporter de email
// Usando credenciais do Gmail ou email customizado
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true' || false, // true para 465, false para outros portos
  auth: {
    user: process.env.EMAIL_USER || 'seu-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'sua-senha-app' // Usar app password para Gmail
  }
});

// Função para enviar email de relatório de plantão
const enviarRelatorioPlan = async (relatorio, observacoes = '') => {
  try {
    // Lista de emails que devem receber o relatório
    const emailsDestino = [
      'ti@astroturviagens.com',
      'admin@astroturviagens.com' // Adicione outros emails conforme necessário
    ];

    // Gerar HTML do relatório
    const htmlRelatorio = gerarHtmlRelatorio(relatorio, observacoes);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@astroturviagens.com',
      to: emailsDestino.join(','),
      subject: `📋 Relatório de Plantão - ${relatorio.data}`,
      html: htmlRelatorio,
      attachments: [
        {
          filename: `relatorio-${relatorio.data.replace(/\//g, '-')}.json`,
          content: JSON.stringify(relatorio, null, 2),
          contentType: 'application/json'
        }
      ]
    };

    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado com sucesso. ID: ${info.messageId}`);
    console.log(`   Para: ${emailsDestino.join(', ')}`);
    return { sucesso: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    return { sucesso: false, erro: error.message };
  }
};

// Função para gerar HTML do relatório
const gerarHtmlRelatorio = (relatorio, observacoes = '') => {
  const stats = relatorio.estatisticas;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #333;
      font-size: 18px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      border-radius: 4px;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .table th {
      background-color: #f8f9fa;
      color: #333;
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #ddd;
      font-weight: 600;
    }
    .table td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .table tr:hover {
      background-color: #f8f9fa;
    }
    .status-concluido {
      color: #22c55e;
      font-weight: 600;
    }
    .status-em-andamento {
      color: #f59e0b;
      font-weight: 600;
    }
    .status-pendente {
      color: #ef4444;
      font-weight: 600;
    }
    .observacoes {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin-top: 20px;
      border-radius: 4px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Relatório de Plantão</h1>
      <p>Data: <strong>${relatorio.data}</strong></p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Resumo Estatístico</h2>
        <div class="stats">
          <div class="stat-card">
            <div class="stat-label">Total de Ocorrências</div>
            <div class="stat-value">${stats.total_ocorrencias}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Concluídas</div>
            <div class="stat-value" style="color: #22c55e;">${stats.concluidas}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Em Andamento</div>
            <div class="stat-value" style="color: #f59e0b;">${stats.em_andamento}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pendentes</div>
            <div class="stat-value" style="color: #ef4444;">${stats.pendentes}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Com Atraso</div>
            <div class="stat-value">${stats.com_atraso}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Troca de Veículo</div>
            <div class="stat-value">${stats.com_troca_veiculo}</div>
          </div>
        </div>
      </div>

      ${observacoes ? `
      <div class="observacoes">
        <strong>📝 Observações do Plantão:</strong>
        <p>${observacoes.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}

      <div class="section">
        <h2>Detalhes das Ocorrências</h2>
        ${gerarTabelaOcorrencias(relatorio.ocorrencias)}
      </div>
    </div>

    <div class="footer">
      <p>Este é um email automático gerado pelo Sistema CCO - Não responda este email</p>
      <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Função para gerar tabela HTML de ocorrências
const gerarTabelaOcorrencias = (ocorrencias) => {
  if (!ocorrencias || ocorrencias.length === 0) {
    return '<p style="color: #999;">Nenhuma ocorrência registrada neste dia.</p>';
  }

  const linhas = ocorrencias.map(occ => `
    <tr>
      <td>${occ.numero_ocorrencia || 'N/A'}</td>
      <td>${occ.cliente_nome || 'N/A'}</td>
      <td>${occ.tipo_quebra || 'N/A'}</td>
      <td><span class="status-${occ.status || 'pendente'}">${formatarStatus(occ.status)}</span></td>
    </tr>
  `).join('');

  return `
    <table class="table">
      <thead>
        <tr>
          <th>Número</th>
          <th>Cliente</th>
          <th>Tipo de Quebra</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;
};

// Função auxiliar para formatar status
const formatarStatus = (status) => {
  const statusMap = {
    'pendente': 'Pendente',
    'em_andamento': 'Em Andamento',
    'concluido': 'Concluído',
    'cancelado': 'Cancelado'
  };
  return statusMap[status] || status;
};

module.exports = {
  enviarRelatorioPlan,
  gerarHtmlRelatorio
};
