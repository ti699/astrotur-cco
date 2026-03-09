const express = require('express');
const router = express.Router();
const db = require('../config/database');

const tableExists = async (tableName) => {
  const result = await db.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return result.rows.length > 0;
};

const getColumns = async (tableName) => {
  const result = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(result.rows.map((row) => row.column_name));
};

const pickFirstColumn = (columns, options) => options.find((option) => columns.has(option));

const insertDynamic = async (tableName, payload) => {
  const keys = Object.keys(payload).filter((key) => payload[key] !== undefined);
  const values = keys.map((key) => payload[key]);
  const placeholders = keys.map((_, index) => `$${index + 1}`);

  const query = `
    INSERT INTO ${tableName} (${keys.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *
  `;

  return db.query(query, values);
};

const mapEntrada = (row) => ({
  id: row.id,
  dataHora: row.datahora ?? row.data_hora ?? row.dataHora,
  monitor: row.monitor,
  veiculo: row.veiculo,
  kmEntrada: row.kmentrada ?? row.km_entrada ?? row.kmEntrada,
  kmInicioRota: row.kminiciorota ?? row.km_inicio_rota ?? row.kmInicioRota,
  kmFimRota: row.kmfimrota ?? row.km_fim_rota ?? row.kmFimRota,
  motorista: row.motorista,
  cliente: row.cliente,
  localSaida: row.localsaida ?? row.local_saida ?? row.localSaida,
  motivo: row.motivo,
  programado: row.programado,
  descricao: row.descricao,
});

const mapSaida = (row) => ({
  id: row.id,
  dataHora: row.datahora ?? row.data_hora ?? row.dataHora,
  monitor: row.monitor,
  veiculo: row.veiculo,
  kmSaida: row.kmsaida ?? row.km_saida ?? row.kmSaida,
  motorista: row.motorista,
  destino: row.destino,
  vistoriaConforme: row.vistoriaconforme ?? row.vistoria_conforme ?? row.vistoriaConforme,
  observacoes: row.observacoes,
});

// GET /api/portaria/entradas - List all entradas
router.get('/entradas', async (req, res) => {
  try {
    if (await tableExists('portaria_entradas')) {
      const result = await db.query('SELECT * FROM portaria_entradas ORDER BY id DESC');
      return res.json(result.rows.map(mapEntrada));
    }

    if (await tableExists('portaria_movimentacoes')) {
      const columns = await getColumns('portaria_movimentacoes');
      const tipoColumn = pickFirstColumn(columns, ['tipo_movimentacao', 'tipo', 'movimento']);
      const orderColumn = pickFirstColumn(columns, ['id', 'created_at', 'data_hora', 'datahora']) || 'id';

      if (tipoColumn) {
        const result = await db.query(
          `SELECT * FROM portaria_movimentacoes WHERE ${tipoColumn} = $1 ORDER BY ${orderColumn} DESC`,
          ['ENTRADA']
        );
        return res.json(result.rows.map(mapEntrada));
      }

      const result = await db.query(`SELECT * FROM portaria_movimentacoes ORDER BY ${orderColumn} DESC`);
      return res.json(result.rows.map(mapEntrada));
    }

    return res.json([]);
  } catch (error) {
    console.error('Erro ao listar entradas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portaria/saidas - List all saidas
router.get('/saidas', async (req, res) => {
  try {
    if (await tableExists('portaria_saidas')) {
      const result = await db.query('SELECT * FROM portaria_saidas ORDER BY id DESC');
      return res.json(result.rows.map(mapSaida));
    }

    if (await tableExists('portaria_movimentacoes')) {
      const columns = await getColumns('portaria_movimentacoes');
      const tipoColumn = pickFirstColumn(columns, ['tipo_movimentacao', 'tipo', 'movimento']);
      const orderColumn = pickFirstColumn(columns, ['id', 'created_at', 'data_hora', 'datahora']) || 'id';

      if (tipoColumn) {
        const result = await db.query(
          `SELECT * FROM portaria_movimentacoes WHERE ${tipoColumn} = $1 ORDER BY ${orderColumn} DESC`,
          ['SAIDA']
        );
        return res.json(result.rows.map(mapSaida));
      }

      const result = await db.query(`SELECT * FROM portaria_movimentacoes ORDER BY ${orderColumn} DESC`);
      return res.json(result.rows.map(mapSaida));
    }

    return res.json([]);
  } catch (error) {
    console.error('Erro ao listar saídas:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portaria/entradas - Create new entrada
router.post('/entradas', async (req, res) => {
  try {
    const { dataHora, monitor, veiculo, kmEntrada, kmInicioRota, kmFimRota, motorista, cliente, localSaida, motivo, programado, descricao } = req.body;

    if (await tableExists('portaria_entradas')) {
      const result = await db.query(
        `INSERT INTO portaria_entradas (dataHora, monitor, veiculo, kmEntrada, kmInicioRota, kmFimRota, motorista, cliente, localSaida, motivo, programado, descricao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [dataHora, monitor, veiculo, kmEntrada, kmInicioRota, kmFimRota, motorista, cliente, localSaida, motivo, programado, descricao || null]
      );

      return res.status(201).json(mapEntrada(result.rows[0]));
    }

    if (await tableExists('portaria_movimentacoes')) {
      const columns = await getColumns('portaria_movimentacoes');

      const payload = {};
      const mapField = (options, value) => {
        const col = pickFirstColumn(columns, options);
        if (col) payload[col] = value;
      };

      mapField(['data_hora', 'datahora', 'dataHora'], dataHora);
      mapField(['monitor'], monitor);
      mapField(['veiculo'], veiculo);
      mapField(['km_entrada', 'kmentrada', 'km'], kmEntrada);
      mapField(['km_inicio_rota', 'kminiciorota'], kmInicioRota);
      mapField(['km_fim_rota', 'kmfimrota'], kmFimRota);
      mapField(['motorista'], motorista);
      mapField(['cliente'], cliente);
      mapField(['local_saida', 'localsaida'], localSaida);
      mapField(['motivo'], motivo);
      mapField(['programado'], programado);
      mapField(['descricao', 'observacoes'], descricao || null);
      mapField(['tipo_movimentacao', 'tipo', 'movimento'], 'ENTRADA');

      const result = await insertDynamic('portaria_movimentacoes', payload);
      return res.status(201).json(mapEntrada(result.rows[0]));
    }

    return res.status(500).json({ error: 'Nenhuma tabela de portaria encontrada no banco' });
  } catch (error) {
    console.error('Erro ao registrar entrada:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portaria/saidas - Create new saida
router.post('/saidas', async (req, res) => {
  try {
    const { dataHora, monitor, veiculo, kmSaida, motorista, destino, vistoriaConforme, observacoes } = req.body;

    if (await tableExists('portaria_saidas')) {
      const result = await db.query(
        `INSERT INTO portaria_saidas (dataHora, monitor, veiculo, kmSaida, motorista, destino, vistoriaConforme, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [dataHora, monitor, veiculo, kmSaida, motorista, destino, vistoriaConforme, observacoes || null]
      );

      return res.status(201).json(mapSaida(result.rows[0]));
    }

    if (await tableExists('portaria_movimentacoes')) {
      const columns = await getColumns('portaria_movimentacoes');

      const payload = {};
      const mapField = (options, value) => {
        const col = pickFirstColumn(columns, options);
        if (col) payload[col] = value;
      };

      mapField(['data_hora', 'datahora', 'dataHora'], dataHora);
      mapField(['monitor'], monitor);
      mapField(['veiculo'], veiculo);
      mapField(['km_saida', 'kmsaida', 'km'], kmSaida);
      mapField(['motorista'], motorista);
      mapField(['destino', 'cliente'], destino);
      mapField(['vistoria_conforme', 'vistoriaconforme'], vistoriaConforme);
      mapField(['observacoes', 'descricao'], observacoes || null);
      mapField(['tipo_movimentacao', 'tipo', 'movimento'], 'SAIDA');

      const result = await insertDynamic('portaria_movimentacoes', payload);
      return res.status(201).json(mapSaida(result.rows[0]));
    }

    return res.status(500).json({ error: 'Nenhuma tabela de portaria encontrada no banco' });
  } catch (error) {
    console.error('Erro ao registrar saída:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/portaria/entradas/:id - Delete entrada
router.delete('/entradas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await db.query('SELECT * FROM portaria_entradas WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entrada não encontrada' });
    }

    await db.query('DELETE FROM portaria_entradas WHERE id = $1', [id]);
    res.json({ message: 'Entrada deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar entrada:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/portaria/saidas/:id - Delete saida
router.delete('/saidas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await db.query('SELECT * FROM portaria_saidas WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Saída não encontrada' });
    }

    await db.query('DELETE FROM portaria_saidas WHERE id = $1', [id]);
    res.json({ message: 'Saída deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar saída:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
