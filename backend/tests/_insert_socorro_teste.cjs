require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { supabase } = require('../config/supabase');
const now = new Date().toISOString();
const payload = {
  tipo_ocorrencia: 'Socorro',
  numero: 'OS-PDF-001',
  status: 'PENDENTE',
  data_quebra: now,
  data_chamado: now,
  descricao: 'Veiculo com pane mecanica na BR-116 KM 45. Guinchotamento solicitado.',
  veiculo_previsto: 'ABC-1234 - Onibus Mercedes',
  socorro_motorista: 'Carlos Eduardo Silva',
  socorro_turno: 'Manha',
  socorro_rota: 'Sao Paulo para Campinas',
  socorro_natureza_defeito: 'Mecanico',
  socorro_tipo_atendimento: 'Socorro (remocao)',
  socorro_houve_troca: false,
  socorro_carro_reserva: 'XYZ-5678',
  horario_inicio_socorro: now,
  horario_fim_socorro: new Date(Date.now() + 90 * 60000).toISOString(),
  aprovado: false,
  houve_atraso: false,
};
supabase.from('ocorrencias').insert(payload).select('id, tipo_ocorrencia, numero').single().then(({ data, error }) => {
  if (error) { console.error('Erro:', error.message); process.exit(1); }
  console.log('ID_SOCORRO=' + data.id + ' numero=' + data.numero);
  process.exit(0);
});
