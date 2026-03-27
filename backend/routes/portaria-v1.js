'use strict';

/**
 * Router: /api/v1/portaria
 *
 * Endpoints versionados com regras de negócio completas.
 * (As rotas legadas /api/portaria/entradas e /api/portaria/saidas permanecem intactas.)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

const { criarSaida } = require('../controllers/portariaSaidaController');

// POST /api/v1/portaria/saida
router.post('/saida', authenticateToken, criarSaida);

module.exports = router;
