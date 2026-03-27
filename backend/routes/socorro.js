/**
 * routes/socorro.js
 * POST /api/v1/socorro — Registrar novo chamado de socorro ASTRO
 */

'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const { criarSocorro } = require('../controllers/socorroController');

router.post('/', authenticateToken, criarSocorro);

module.exports = router;
