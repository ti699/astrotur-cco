'use strict';

/**
 * Router: /api/v1/portaria
 *
 * Endpoints versionados com regras de negócio completas.
 * (As rotas legadas /api/portaria/entradas e /api/portaria/saidas permanecem intactas.)
 */

const express = require('express');
const router = express.Router();

const { criarSaida } = require('../controllers/portariaSaidaController');

// POST /api/v1/portaria/saida — Registrar saída de veículo vinculada a uma entrada
router.post('/saida', criarSaida);

module.exports = router;
