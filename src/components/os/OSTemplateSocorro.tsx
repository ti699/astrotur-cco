import React, { useEffect } from "react";

interface OSTemplateSocorroProps {
  ocorrencia: any;
  onClose?: () => void;
}

export function OSTemplateSocorro({ ocorrencia, onClose }: OSTemplateSocorroProps) {
  useEffect(() => {
    setTimeout(() => {
      window.print();
      if (onClose) onClose();
    }, 500);
  }, [onClose]);

  const dataEmissao = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dataFormatada = `${pad(dataEmissao.getDate())}/${pad(dataEmissao.getMonth() + 1)}/${dataEmissao.getFullYear()}`;
  const horaFormatada = `${pad(dataEmissao.getHours())}:${pad(dataEmissao.getMinutes())}`;
  const codigoOS = `OS${ocorrencia.id || ocorrencia.numero_ocorrencia || Math.floor(Math.random()*100000)}`;

  // Fotos anexadas (array de URLs ou base64)
  const fotos = ocorrencia.fotos || [];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', width: '210mm', minHeight: '297mm', margin: '0 auto', padding: 32, background: '#fff', color: '#222' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: 16, marginBottom: 24 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 60, marginRight: 24 }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Ordem de Serviço — Socorro</h1>
          <div style={{ fontSize: 16, marginTop: 4 }}>Código: <b>{codigoOS}</b></div>
          <div style={{ fontSize: 14, marginTop: 2 }}>Emissão: {dataFormatada} {horaFormatada}</div>
        </div>
      </div>

      {/* Dados da Ocorrência */}
      <div style={{ marginBottom: 24 }}>
        <table style={{ width: '100%', fontSize: 15, borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td><b>Data/Hora Início:</b> {ocorrencia.data_ocorrencia || '—'}</td>
              <td><b>Data/Hora Fim:</b> {ocorrencia.data_fim || '—'}</td>
            </tr>
            <tr>
              <td><b>Turno:</b> {ocorrencia.turno || '—'}</td>
              <td><b>Cliente:</b> {ocorrencia.cliente_nome || '—'}</td>
            </tr>
            <tr>
              <td><b>Plantão:</b> {ocorrencia.plantonista || ocorrencia.monitor_nome || '—'}</td>
              <td><b>Motorista:</b> {ocorrencia.motorista_nome || '—'}</td>
            </tr>
            <tr>
              <td><b>Rota:</b> {ocorrencia.rota || '—'}</td>
              <td><b>Natureza:</b> {ocorrencia.natureza || '—'}</td>
            </tr>
            <tr>
              <td><b>Tipo de Atendimento:</b> {ocorrencia.tipo_atendimento || '—'}</td>
              <td><b>Status:</b> {ocorrencia.status || '—'}</td>
            </tr>
            <tr>
              <td><b>Houve Troca:</b> {ocorrencia.houve_troca ? 'Sim' : 'Não'} {ocorrencia.houve_troca && ocorrencia.carro_reserva ? `— Carro Reserva: ${ocorrencia.carro_reserva}` : ''}</td>
              <td><b>Atraso:</b> {ocorrencia.atraso ? `Sim — ${ocorrencia.minutos_atraso || 0} min` : 'Não'}</td>
            </tr>
            <tr>
              <td><b>Aprovador:</b> {ocorrencia.aprovador || '—'}</td>
              <td><b>Descrição:</b> {ocorrencia.descricao || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Fotos */}
      {fotos.length > 0 && (
        <div style={{ margin: '32px 0', textAlign: 'center' }}>
          <h3 style={{ marginBottom: 12 }}>Foto(s) Anexada(s)</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {fotos.map((foto: string, idx: number) => (
              <img key={idx} src={foto} alt={`Foto ${idx + 1}`} style={{ maxHeight: 220, maxWidth: 320, border: '1px solid #ccc', borderRadius: 6, margin: 4 }} />
            ))}
          </div>
        </div>
      )}

      {/* Assinaturas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '48px 0 24px 0' }}>
        <div style={{ width: '45%', textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #222', height: 36, marginBottom: 4 }}></div>
          <div style={{ fontSize: 14 }}>Tráfego</div>
          <div style={{ fontSize: 12, color: '#666' }}>{ocorrencia.responsavel_trafego || 'Nome do responsável'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Cargo: {ocorrencia.cargo_trafego || '—'}</div>
        </div>
        <div style={{ width: '45%', textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #222', height: 36, marginBottom: 4 }}></div>
          <div style={{ fontSize: 14 }}>Manutenção</div>
          <div style={{ fontSize: 12, color: '#666' }}>{ocorrencia.responsavel_manutencao || 'Nome do responsável'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Cargo: {ocorrencia.cargo_manutencao || '—'}</div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ borderTop: '1px solid #ccc', marginTop: 32, paddingTop: 12, fontSize: 13, color: '#555', textAlign: 'center' }}>
        <div>Impressão: {dataFormatada} {horaFormatada}</div>
        <div>Sistema Astrotur CCO — Astrotur Transportes</div>
      </div>
    </div>
  );
}
