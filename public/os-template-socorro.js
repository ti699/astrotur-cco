// UMD export do componente OSTemplateSocorro para uso no print bundle
window.OSTemplateSocorro = function OSTemplateSocorro({ ocorrencia }) {
  // ... mesmo conteúdo do componente OSTemplateSocorro.tsx, mas sem import/export ...
  const dataEmissao = new Date();
  const pad = n => n.toString().padStart(2, "0");
  const dataFormatada = `${pad(dataEmissao.getDate())}/${pad(dataEmissao.getMonth() + 1)}/${dataEmissao.getFullYear()}`;
  const horaFormatada = `${pad(dataEmissao.getHours())}:${pad(dataEmissao.getMinutes())}`;
  const codigoOS = `OS${ocorrencia.id || ocorrencia.numero_ocorrencia || Math.floor(Math.random()*100000)}`;
  const fotos = ocorrencia.fotos || [];
  React.useEffect(() => { setTimeout(() => window.print(), 500); }, []);
  return React.createElement('div', { style: { fontFamily: 'Arial, sans-serif', width: '210mm', minHeight: '297mm', margin: '0 auto', padding: 40, background: '#fff', color: '#222' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: 24, marginBottom: 40 } },
      React.createElement('img', { src: '/logo.png', alt: 'Logo', style: { height: 60, marginRight: 24 } }),
      React.createElement('div', null,
        React.createElement('h1', { style: { margin: 0, fontSize: 28 } }, 'Ordem de Serviço — Socorro'),
        React.createElement('div', { style: { fontSize: 16, marginTop: 4 } }, 'Código: ', React.createElement('b', null, codigoOS)),
        React.createElement('div', { style: { fontSize: 14, marginTop: 2 } }, 'Emissão: ', dataFormatada, ' ', horaFormatada)
      )
    ),
    React.createElement('div', { style: { marginBottom: 40 } },
      React.createElement('table', { style: { width: '100%', fontSize: 16, borderCollapse: 'separate', borderSpacing: '0 16px' } },
        React.createElement('tbody', null,
          React.createElement('tr', { style: { height: 32 } },
            React.createElement('td', null, React.createElement('b', null, 'Data/Hora Início:'), ' ', ocorrencia.data_ocorrencia || '—'),
            React.createElement('td', null, React.createElement('b', null, 'Data/Hora Fim:'), ' ', ocorrencia.data_fim || '—')
          ),
          React.createElement('tr', { style: { height: 32 } },
            React.createElement('td', null, React.createElement('b', null, 'Turno:'), ' ', ocorrencia.turno || '—'),
            React.createElement('td', null, React.createElement('b', null, 'Cliente:'), ' ', ocorrencia.cliente_nome || '—')
          ),
          React.createElement('tr', { style: { height: 32 } },
            React.createElement('td', null, React.createElement('b', null, 'Plantão:'), ' ', ocorrencia.plantonista || ocorrencia.monitor_nome || '—'),
            React.createElement('td', null, React.createElement('b', null, 'Motorista:'), ' ', ocorrencia.motorista_nome || '—')
          ),
          React.createElement('tr', { style: { height: 32 } },
            React.createElement('td', null, React.createElement('b', null, 'Rota:'), ' ', ocorrencia.rota || '—'),
            React.createElement('td', null, React.createElement('b', null, 'Natureza:'), ' ', ocorrencia.natureza || '—')
          ),
          React.createElement('tr', { style: { height: 32 } },
            React.createElement('td', null, React.createElement('b', null, 'Tipo de Atendimento:'), ' ', ocorrencia.tipo_atendimento || '—'),
            React.createElement('td', null, React.createElement('b', null, 'Status:'), ' ', ocorrencia.status || '—')
          ),
          React.createElement('tr', { style: { height: 32 } },
            React.createElement('td', null, React.createElement('b', null, 'Houve Troca:'), ' ', ocorrencia.houve_troca ? 'Sim' : 'Não', ocorrencia.houve_troca && ocorrencia.carro_reserva ? ` — Carro Reserva: ${ocorrencia.carro_reserva}` : ''),
            React.createElement('td', null, React.createElement('b', null, 'Atraso:'), ' ', ocorrencia.atraso ? `Sim — ${ocorrencia.minutos_atraso || 0} min` : 'Não')
          ),
          React.createElement('tr', { style: { height: 32 } },
            React.createElement('td', null, React.createElement('b', null, 'Aprovador:'), ' ', ocorrencia.aprovador || '—'),
            React.createElement('td', null, React.createElement('b', null, 'Descrição:'), ' ', ocorrencia.descricao || '—')
          )
        )
      )
    ),
    fotos.length > 0 && React.createElement('div', { style: { margin: '48px 0', textAlign: 'center' } },
      React.createElement('h3', { style: { marginBottom: 12 } }, 'Foto(s) Anexada(s)'),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' } },
        fotos.map((foto, idx) => React.createElement('img', { key: idx, src: foto, alt: `Foto ${idx + 1}`, style: { maxHeight: 220, maxWidth: 320, border: '1px solid #ccc', borderRadius: 6, margin: 4 } }))
      )
    ),
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', margin: '64px 0 40px 0' } },
      React.createElement('div', { style: { width: '45%', textAlign: 'center' } },
        React.createElement('div', { style: { borderBottom: '1px solid #222', height: 36, marginBottom: 4 } }),
        React.createElement('div', { style: { fontSize: 14 } }, 'Tráfego'),
        React.createElement('div', { style: { fontSize: 12, color: '#666' } }, ocorrencia.responsavel_trafego || 'Nome do responsável'),
        React.createElement('div', { style: { fontSize: 12, color: '#666' } }, 'Cargo: ', ocorrencia.cargo_trafego || '—')
      ),
      React.createElement('div', { style: { width: '45%', textAlign: 'center' } },
        React.createElement('div', { style: { borderBottom: '1px solid #222', height: 36, marginBottom: 4 } }),
        React.createElement('div', { style: { fontSize: 14 } }, 'Manutenção'),
        React.createElement('div', { style: { fontSize: 12, color: '#666' } }, ocorrencia.responsavel_manutencao || 'Nome do responsável'),
        React.createElement('div', { style: { fontSize: 12, color: '#666' } }, 'Cargo: ', ocorrencia.cargo_manutencao || '—')
      )
    ),
    React.createElement('div', { style: { borderTop: '1px solid #ccc', marginTop: 48, paddingTop: 18, fontSize: 14, color: '#555', textAlign: 'center' } },
      React.createElement('div', null, 'Impressão: ', dataFormatada, ' ', horaFormatada),
      React.createElement('div', null, 'Sistema Astrotur CCO — Astrotur Transportes')
    )
  );
};
