import React, { useEffect } from "react";

interface OSTemplateSocorroProps {
  ocorrencia: any;
  onClose?: () => void;
}

export function OSTemplateSocorroModeloNovo({ ocorrencia, onClose }: OSTemplateSocorroProps) {
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
  const codigoOS = `#${ocorrencia.numero_ocorrencia || ocorrencia.id || Math.floor(Math.random()*100000)}`;

  // Fotos anexadas (array de URLs ou base64)
  const fotos = ocorrencia.fotos || [];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', width: '210mm', minHeight: '297mm', margin: '0 auto', background: '#fff', color: '#222' }}>
      {/* Cabeçalho vermelho */}
      <div style={{ background: '#d32f2f', color: '#fff', padding: '32px 32px 16px 32px', borderRadius: '0 0 8px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 48, marginRight: 24 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: 1 }}>GRUPO ASTROTUR - SISTEMA CCO</div>
            <div style={{ fontWeight: 600, fontSize: 18, marginTop: 2 }}>Ordem de Serviço - Ocorrência {codigoOS}</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>Av. Dr. José Rufino, 151 - Jiquiá, Recife - PE - 50771-600</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>Gerado em: {dataFormatada} {horaFormatada}</div>
          </div>
        </div>
      </div>

      {/* Blocos de resumo */}
      <div style={{ display: 'flex', gap: 16, margin: '32px 0 16px 0', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16, minWidth: 120, textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Monitor</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{ocorrencia.monitor_nome || 'N/A'}</div>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16, minWidth: 120, textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Cliente</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{ocorrencia.cliente_nome || 'N/A'}</div>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16, minWidth: 120, textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Tipo</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{ocorrencia.tipo_ocorrencia || 'N/A'}</div>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16, minWidth: 120, textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Veículo</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{ocorrencia.veiculo_placa || 'N/A'}</div>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16, minWidth: 120, textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 13, color: '#888' }}>Status</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{ocorrencia.status || 'N/A'}</div>
        </div>
      </div>

      {/* Dados detalhados */}
      <div style={{ margin: '24px 0 0 0' }}>
        <div style={{ fontWeight: 700, color: '#d32f2f', fontSize: 16, marginBottom: 8 }}>DADOS DETALHADOS</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead>
            <tr style={{ background: '#d32f2f', color: '#fff' }}>
              <th style={{ padding: 8 }}>DATA</th>
              <th style={{ padding: 8 }}>HORA</th>
              <th style={{ padding: 8 }}>MONITOR</th>
              <th style={{ padding: 8 }}>CLIENTE</th>
              <th style={{ padding: 8 }}>TIPO</th>
              <th style={{ padding: 8 }}>VEÍCULO</th>
              <th style={{ padding: 8 }}>STATUS</th>
              <th style={{ padding: 8 }}>DESCRIÇÃO</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#fafafa' }}>
              <td style={{ padding: 8 }}>{(ocorrencia.data_ocorrencia || '').split('T')[0]}</td>
              <td style={{ padding: 8 }}>{(ocorrencia.data_ocorrencia || '').slice(11, 16)}</td>
              <td style={{ padding: 8 }}>{ocorrencia.monitor_nome || '—'}</td>
              <td style={{ padding: 8 }}>{ocorrencia.cliente_nome || '—'}</td>
              <td style={{ padding: 8 }}>{ocorrencia.tipo_ocorrencia || '—'}</td>
              <td style={{ padding: 8 }}>{ocorrencia.veiculo_placa || '—'}</td>
              <td style={{ padding: 8 }}>{ocorrencia.status || '—'}</td>
              <td style={{ padding: 8 }}>{ocorrencia.descricao || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Fotos */}
      {fotos.length > 0 && (
        <div style={{ margin: '32px 0', textAlign: 'center' }}>
          <h3 style={{ marginBottom: 12, color: '#d32f2f' }}>Foto(s) Anexada(s)</h3>
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
