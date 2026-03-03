const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Mock de dados em memória para quando o banco não estiver disponível
const mockStats = {
  totalOcorrencias: 30,
  atrasos: 4,
  veiculosAtribuidos: 210,
  tempoMedioAtendimento: '1 hora e 46 min',
  ocorrenciasHoje: 1,
  comparacaoMesAnterior: 12, // percentual
  comparacaoAtrasos: -5 // percentual
};

const mockOcorrenciasPorDia = [
  { data: '15/11', quantidade: 2 },
  { data: '16/11', quantidade: 1 },
  { data: '17/11', quantidade: 1 },
  { data: '18/11', quantidade: 3 },
  { data: '19/11', quantidade: 2 },
  { data: '20/11', quantidade: 3 },
  { data: '21/11', quantidade: 1 }
];

const mockTopTipos = [
  { tipo: 'Suspensão', total: 12 },
  { tipo: 'Motor', total: 7 },
  { tipo: 'Lubrificação', total: 7 },
  { tipo: 'Elétrica', total: 4 }
];

const mockUltimasOcorrencias = [
  {
    id: 1,
    numero_ocorrencia: '005312',
    cliente_nome: 'Hotel Mar Azul',
    tipo_quebra: 'Suspensão',
    data_ocorrencia: '2025-11-24T12:12:00',
    status: 'pendente'
  },
  {
    id: 2,
    numero_ocorrencia: '005311',
    cliente_nome: 'Pousada Sol Nascente',
    tipo_quebra: 'Motor',
    data_ocorrencia: '2025-11-24T10:30:00',
    status: 'concluido'
  },
  {
    id: 3,
    numero_ocorrencia: '005310',
    cliente_nome: 'Resort Paraíso',
    tipo_quebra: 'Suspensão',
    data_ocorrencia: '2025-11-23T15:45:00',
    status: 'pendente'
  },
  {
    id: 4,
    numero_ocorrencia: '005309',
    cliente_nome: 'Hotel Vista Mar',
    tipo_quebra: 'Elétrica',
    data_ocorrencia: '2025-11-23T09:20:00',
    status: 'em_andamento'
  },
  {
    id: 5,
    numero_ocorrencia: '005308',
    cliente_nome: 'Pousada Tropical',
    tipo_quebra: 'Motor',
    data_ocorrencia: '2025-11-22T14:10:00',
    status: 'concluido'
  }
];

// Resumo: Retorna counts gerais (stats + veículos por tipo) em um único endpoint
router.get('/resumo', async (req, res) => {
  try {
    let stats;
    let veiculosPorTipo = [];
    
    try {
      // Buscar estatísticas
      const totalResult = await db.query(
        `SELECT COUNT(*) as total,
                COUNT(CASE WHEN data_ocorrencia >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias,
                COUNT(CASE WHEN DATE(data_ocorrencia) = CURRENT_DATE THEN 1 END) as hoje
         FROM ocorrencias`
      );

      const atrasosResult = await db.query(
        `SELECT COUNT(*) as total
         FROM ocorrencias
         WHERE status IN ('pendente', 'em_andamento')
         AND data_ocorrencia < CURRENT_DATE - INTERVAL '2 days'`
      );

      const veiculosResult = await db.query(
        'SELECT COUNT(*) as total FROM veiculos WHERE ativo = true'
      );

      const tempoMedioResult = await db.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (data_conclusao - data_ocorrencia))/3600) as media_horas
         FROM ocorrencias
         WHERE status = 'concluido' AND data_conclusao IS NOT NULL
         AND data_ocorrencia >= CURRENT_DATE - INTERVAL '30 days'`
      );

      const mediaHoras = tempoMedioResult.rows[0]?.media_horas || 0;
      const horas = Math.floor(mediaHoras);
      const minutos = Math.round((mediaHoras - horas) * 60);

      stats = {
        totalOcorrencias: parseInt(totalResult.rows[0]?.ultimos_30_dias || 0),
        atrasos: parseInt(atrasosResult.rows[0]?.total || 0),
        veiculosAtribuidos: parseInt(veiculosResult.rows[0]?.total || 0),
        tempoMedioAtendimento: `${horas} hora${horas !== 1 ? 's' : ''} e ${minutos} min`,
        ocorrenciasHoje: parseInt(totalResult.rows[0]?.hoje || 0),
        comparacaoMesAnterior: 12,
        comparacaoAtrasos: -5
      };

      // Buscar veículos por tipo
      const veiculosResult2 = await db.query(
        `SELECT 
           CASE 
             WHEN LOWER(modelo) LIKE '%van%' THEN 'VAN'
             WHEN LOWER(modelo) LIKE '%micro%' THEN 'MICRO'
             WHEN LOWER(modelo) LIKE '%ônibus%' OR LOWER(modelo) LIKE '%onibus%' THEN 'ÔNIBUS'
             ELSE 'OUTROS'
           END as tipo,
           COUNT(*) as total
         FROM veiculos
         WHERE ativo = true
         GROUP BY tipo
         ORDER BY total DESC`
      );

      veiculosPorTipo = veiculosResult2.rows.map(r => ({ tipo: r.tipo, total: parseInt(r.total) }));
    } catch (dbError) {
      console.log('📊 Usando dados da memória para resumo');
      const ocorrenciasModule = require('./ocorrencias');
      const ocorrenciasMemory = ocorrenciasModule.getOcorrenciasMemory ? ocorrenciasModule.getOcorrenciasMemory() : [];
      
      if (ocorrenciasMemory.length > 0) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const ocorrenciasHoje = ocorrenciasMemory.filter(o => {
          const dataOcorrencia = new Date(o.created_at || o.data_ocorrencia);
          dataOcorrencia.setHours(0, 0, 0, 0);
          return dataOcorrencia.getTime() === hoje.getTime();
        }).length;
        
        const atrasos = ocorrenciasMemory.filter(o => o.houve_atraso === 'sim').length;
        const veiculosUnicos = new Set(ocorrenciasMemory.map(o => o.veiculo_placa).filter(Boolean));
        
        const ocorrenciasComTempo = ocorrenciasMemory.filter(o => 
          o.horario_socorro && o.horario_saida && o.status === 'concluido'
        );
        
        let tempoMedioAtendimento = '0 hora e 0 min';
        if (ocorrenciasComTempo.length > 0) {
          let totalMinutos = 0;
          ocorrenciasComTempo.forEach(o => {
            const [horaS, minS] = o.horario_socorro.split(':').map(Number);
            const [horaSa, minSa] = o.horario_saida.split(':').map(Number);
            const minutosInicio = horaS * 60 + minS;
            const minutosFim = horaSa * 60 + minSa;
            totalMinutos += (minutosFim - minutosInicio);
          });
          
          const mediaMinutos = Math.round(totalMinutos / ocorrenciasComTempo.length);
          const horas = Math.floor(mediaMinutos / 60);
          const minutos = mediaMinutos % 60;
          tempoMedioAtendimento = `${horas} hora${horas !== 1 ? 's' : ''} e ${minutos} min`;
        }
        
        stats = {
          totalOcorrencias: ocorrenciasMemory.length,
          atrasos: atrasos,
          veiculosAtribuidos: veiculosUnicos.size,
          tempoMedioAtendimento: tempoMedioAtendimento,
          ocorrenciasHoje: ocorrenciasHoje,
          comparacaoMesAnterior: 12,
          comparacaoAtrasos: -5
        };
      } else {
        stats = mockStats;
      }
    }

    return res.json({ stats, veiculosPorTipo });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ message: 'Erro ao buscar resumo' });
  }
});

// Estatísticas gerais do dashboard
router.get('/stats', async (req, res) => {
  try {
    let stats;
    
    try {
      // Tentar buscar do banco
      const totalResult = await db.query(
        `SELECT COUNT(*) as total,
                COUNT(CASE WHEN data_ocorrencia >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias,
                COUNT(CASE WHEN DATE(data_ocorrencia) = CURRENT_DATE THEN 1 END) as hoje
         FROM ocorrencias`
      );

      const atrasosResult = await db.query(
        `SELECT COUNT(*) as total
         FROM ocorrencias
         WHERE status IN ('pendente', 'em_andamento')
         AND data_ocorrencia < CURRENT_DATE - INTERVAL '2 days'`
      );

      const veiculosResult = await db.query(
        'SELECT COUNT(*) as total FROM veiculos WHERE ativo = true'
      );

      const tempoMedioResult = await db.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (data_conclusao - data_ocorrencia))/3600) as media_horas
         FROM ocorrencias
         WHERE status = 'concluido' AND data_conclusao IS NOT NULL
         AND data_ocorrencia >= CURRENT_DATE - INTERVAL '30 days'`
      );

      const mediaHoras = tempoMedioResult.rows[0]?.media_horas || 0;
      const horas = Math.floor(mediaHoras);
      const minutos = Math.round((mediaHoras - horas) * 60);

      stats = {
        totalOcorrencias: parseInt(totalResult.rows[0]?.ultimos_30_dias || 0),
        atrasos: parseInt(atrasosResult.rows[0]?.total || 0),
        veiculosAtribuidos: parseInt(veiculosResult.rows[0]?.total || 0),
        tempoMedioAtendimento: `${horas} hora${horas !== 1 ? 's' : ''} e ${minutos} min`,
        ocorrenciasHoje: parseInt(totalResult.rows[0]?.hoje || 0),
        comparacaoMesAnterior: 12,
        comparacaoAtrasos: -5
      };
    } catch (dbError) {
      // Se banco não disponível, usar memória ou mock
      console.log('📊 Usando estatísticas da memória');
      const ocorrenciasModule = require('./ocorrencias');
      const ocorrenciasMemory = ocorrenciasModule.getOcorrenciasMemory ? ocorrenciasModule.getOcorrenciasMemory() : [];
      
      if (ocorrenciasMemory.length > 0) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const ocorrenciasHoje = ocorrenciasMemory.filter(o => {
          const dataOcorrencia = new Date(o.created_at || o.data_ocorrencia);
          dataOcorrencia.setHours(0, 0, 0, 0);
          return dataOcorrencia.getTime() === hoje.getTime();
        }).length;
        
        // Contar APENAS ocorrências com houve_atraso === 'sim'
        const atrasos = ocorrenciasMemory.filter(o => o.houve_atraso === 'sim').length;
        
        // Contar veículos únicos
        const veiculosUnicos = new Set(ocorrenciasMemory.map(o => o.veiculo_placa).filter(Boolean));
        
        // Calcular tempo médio de atendimento
        const ocorrenciasComTempo = ocorrenciasMemory.filter(o => 
          o.horario_socorro && o.horario_saida && o.status === 'concluido'
        );
        
        let tempoMedioAtendimento = '0 hora e 0 min';
        if (ocorrenciasComTempo.length > 0) {
          let totalMinutos = 0;
          ocorrenciasComTempo.forEach(o => {
            const [horaS, minS] = o.horario_socorro.split(':').map(Number);
            const [horaSa, minSa] = o.horario_saida.split(':').map(Number);
            const minutosInicio = horaS * 60 + minS;
            const minutosFim = horaSa * 60 + minSa;
            totalMinutos += (minutosFim - minutosInicio);
          });
          
          const mediaMinutos = Math.round(totalMinutos / ocorrenciasComTempo.length);
          const horas = Math.floor(mediaMinutos / 60);
          const minutos = mediaMinutos % 60;
          tempoMedioAtendimento = `${horas} hora${horas !== 1 ? 's' : ''} e ${minutos} min`;
        }
        
        stats = {
          totalOcorrencias: ocorrenciasMemory.length,
          atrasos: atrasos,
          veiculosAtribuidos: veiculosUnicos.size,
          tempoMedioAtendimento: tempoMedioAtendimento,
          ocorrenciasHoje: ocorrenciasHoje,
          comparacaoMesAnterior: 12,
          comparacaoAtrasos: -5
        };
      } else {
        stats = mockStats;
      }
    }

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// Ocorrências por dia (últimos 7 dias)
router.get('/ocorrencias-por-dia', async (req, res) => {
  try {
    let dados;

    try {
      const result = await db.query(
        `SELECT 
           TO_CHAR(data_ocorrencia, 'DD/MM') as data,
           COUNT(*) as quantidade
         FROM ocorrencias
         WHERE data_ocorrencia >= CURRENT_DATE - INTERVAL '7 days'
         GROUP BY DATE(data_ocorrencia), TO_CHAR(data_ocorrencia, 'DD/MM')
         ORDER BY DATE(data_ocorrencia) ASC`
      );

      dados = result.rows.map(row => ({
        data: row.data,
        quantidade: parseInt(row.quantidade)
      }));
    } catch (dbError) {
      console.log('📊 Calculando ocorrências por dia da memória');
      const ocorrenciasModule = require('./ocorrencias');
      const ocorrenciasMemory = ocorrenciasModule.getOcorrenciasMemory ? ocorrenciasModule.getOcorrenciasMemory() : [];
      
      if (ocorrenciasMemory.length > 0) {
        // Agrupar ocorrências por dia dos últimos 7 dias
        const hoje = new Date();
        const ultimosDias = [];
        
        for (let i = 6; i >= 0; i--) {
          const data = new Date(hoje);
          data.setDate(data.getDate() - i);
          data.setHours(0, 0, 0, 0);
          
          const dia = String(data.getDate()).padStart(2, '0');
          const mes = String(data.getMonth() + 1).padStart(2, '0');
          const dataFormatada = `${dia}/${mes}`;
          
          const ocorrenciasDoDia = ocorrenciasMemory.filter(o => {
            const dataOcorrencia = new Date(o.created_at || o.data_ocorrencia);
            dataOcorrencia.setHours(0, 0, 0, 0);
            return dataOcorrencia.getTime() === data.getTime();
          }).length;
          
          ultimosDias.push({ data: dataFormatada, quantidade: ocorrenciasDoDia });
        }
        
        dados = ultimosDias;
      } else {
        // Se não há dados, retorna array vazio
        dados = [];
      }
    }

    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar ocorrências por dia:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// Top 5 tipos de ocorrência
router.get('/top-tipos', async (req, res) => {
  try {
    let dados;

    try {
      const result = await db.query(
        `SELECT 
           tb.nome as tipo,
           COUNT(o.id) as total
         FROM ocorrencias o
         LEFT JOIN tipos_quebra tb ON o.tipo_quebra_id = tb.id
         WHERE o.data_ocorrencia >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY tb.nome
         ORDER BY COUNT(o.id) DESC
         LIMIT 5`
      );

      dados = result.rows.map(row => ({
        tipo: row.tipo || 'Outros',
        total: parseInt(row.total)
      }));
    } catch (dbError) {
      console.log('📊 Calculando top tipos da memória');
      const ocorrenciasModule = require('./ocorrencias');
      const ocorrenciasMemory = ocorrenciasModule.getOcorrenciasMemory ? ocorrenciasModule.getOcorrenciasMemory() : [];
      
      if (ocorrenciasMemory.length > 0) {
        // Contar ocorrências por tipo
        const tiposCont = {};
        ocorrenciasMemory.forEach(o => {
          const tipo = o.tipo_ocorrencia || 'Outros';
          tiposCont[tipo] = (tiposCont[tipo] || 0) + 1;
        });
        
        // Converter para array e ordenar
        dados = Object.entries(tiposCont)
          .map(([tipo, total]) => ({ tipo, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
      } else {
        dados = [];
      }
    }

    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar top tipos:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// Últimas ocorrências
router.get('/ultimas-ocorrencias', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    let dados;

    try {
      const result = await db.query(
        `SELECT 
           o.id,
           o.numero as numero_ocorrencia,
           COALESCE(c.nome, (o.observacoes::json->>'cliente_nome')) as cliente_nome,
           COALESCE(tb.nome, (o.observacoes::json->>'tipo_ocorrencia')) as tipo_quebra,
           o.data_quebra as data_ocorrencia,
           o.status,
           o.observacoes
         FROM ocorrencias o
         LEFT JOIN clientes c ON o.cliente_id = c.id
         LEFT JOIN tipos_quebra tb ON o.tipo_quebra_id = tb.id
         ORDER BY o.created_at DESC
         LIMIT $1`,
        [limit]
      );

      dados = result.rows;
      console.log(`📊 ${dados.length} ocorrências encontradas no banco de dados`);
      if (dados.length > 0) {
        console.log('📊 Exemplo de dados:', dados[0]);
      }
    } catch (dbError) {
      console.log('📊 Usando últimas ocorrências da memória');
      console.error('Erro do banco:', dbError.message);
      // Buscar da memória de ocorrências do módulo ocorrencias.js
      const ocorrenciasModule = require('./ocorrencias');
      const ocorrenciasMemory = ocorrenciasModule.getOcorrenciasMemory ? ocorrenciasModule.getOcorrenciasMemory() : [];
      
      if (ocorrenciasMemory.length > 0) {
        dados = ocorrenciasMemory
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, limit)
          .map(o => ({
            id: o.id,
            numero_ocorrencia: o.numero_ocorrencia,
            cliente_nome: o.cliente_nome,
            tipo_quebra: o.tipo_ocorrencia,
            data_ocorrencia: o.data_ocorrencia || o.created_at,
            status: o.status
          }));
        console.log(`📊 ${dados.length} ocorrências retornadas da memória`);
      } else {
        dados = mockUltimasOcorrencias.slice(0, limit);
        console.log(`📊 ${dados.length} ocorrências mock retornadas`);
      }
    }

    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar últimas ocorrências:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// Distribuição de status
router.get('/distribuicao-status', async (req, res) => {
  try {
    let dados;

    try {
      const result = await db.query(
        `SELECT 
           status,
           COUNT(*) as total
         FROM ocorrencias
         WHERE data_ocorrencia >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY status`
      );

      dados = result.rows.map(row => ({
        status: row.status,
        total: parseInt(row.total)
      }));
    } catch (dbError) {
      console.log('📊 Calculando distribuição de status da memória');
      const ocorrenciasModule = require('./ocorrencias');
      const ocorrenciasMemory = ocorrenciasModule.getOcorrenciasMemory ? ocorrenciasModule.getOcorrenciasMemory() : [];
      
      if (ocorrenciasMemory.length > 0) {
        const statusCont = {};
        ocorrenciasMemory.forEach(o => {
          const status = o.status || 'pendente';
          statusCont[status] = (statusCont[status] || 0) + 1;
        });
        
        dados = Object.entries(statusCont)
          .map(([status, total]) => ({ status, total }));
      } else {
        dados = [];
      }
    }

    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar distribuição de status:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

// Distribuição por tipo de veículo
router.get('/distribuicao-veiculos', async (req, res) => {
  try {
    let dados;

    try {
      const result = await db.query(
        `SELECT 
           CASE 
             WHEN LOWER(v.modelo) LIKE '%van%' THEN 'Van'
             WHEN LOWER(v.modelo) LIKE '%micro%' THEN 'Micro-ônibus'
             WHEN LOWER(v.modelo) LIKE '%ônibus%' OR LOWER(v.modelo) LIKE '%onibus%' THEN 'Ônibus'
             ELSE 'Outros'
           END as tipo_veiculo,
           COUNT(o.id) as total
         FROM ocorrencias o
         LEFT JOIN veiculos v ON o.veiculo_id = v.id
         WHERE o.data_ocorrencia >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY tipo_veiculo
         ORDER BY total DESC`
      );

      dados = result.rows.map(row => ({
        tipo: row.tipo_veiculo,
        total: parseInt(row.total)
      }));
    } catch (dbError) {
      console.log('📊 Calculando distribuição de veículos da memória');
      const ocorrenciasModule = require('./ocorrencias');
      const ocorrenciasMemory = ocorrenciasModule.getOcorrenciasMemory ? ocorrenciasModule.getOcorrenciasMemory() : [];
      
      if (ocorrenciasMemory.length > 0) {
        // Agrupar por cliente (já que cada veículo tem cliente)
        const clientesCont = {};
        ocorrenciasMemory.forEach(o => {
          const cliente = o.cliente_nome || 'Outros';
          clientesCont[cliente] = (clientesCont[cliente] || 0) + 1;
        });
        
        dados = Object.entries(clientesCont)
          .map(([tipo, total]) => ({ tipo, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
      } else {
        dados = [];
      }
    }

    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar distribuição de veículos:', error);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

module.exports = router;

// Veículos por tipo (contagem de veículos ativos agrupados por tipo inferido a partir do modelo)
router.get('/veiculos-por-tipo', async (req, res) => {
  try {
    try {
      const result = await db.query(
        `SELECT 
           CASE 
             WHEN LOWER(modelo) LIKE '%van%' THEN 'VAN'
             WHEN LOWER(modelo) LIKE '%micro%' THEN 'MICRO'
             WHEN LOWER(modelo) LIKE '%ônibus%' OR LOWER(modelo) LIKE '%onibus%' THEN 'ÔNIBUS'
             ELSE 'OUTROS'
           END as tipo,
           COUNT(*) as total
         FROM veiculos
         WHERE ativo = true
         GROUP BY tipo
         ORDER BY total DESC`
      );

      const dados = result.rows.map(r => ({ tipo: r.tipo, total: parseInt(r.total) }));
      return res.json(dados);
    } catch (dbError) {
      console.log('📊 Erro ao buscar veículos por tipo:', dbError);
      return res.json([]);
    }
  } catch (error) {
    console.error('Erro no endpoint veiculos-por-tipo:', error);
    res.status(500).json({ message: 'Erro ao buscar veículos por tipo' });
  }
});
