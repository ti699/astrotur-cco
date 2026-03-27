'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const { enviarRelatorioPortaria } = require('../controllers/emailController');

// POST /api/email/relatorio-portaria
router.post('/relatorio-portaria', authenticateToken, enviarRelatorioPortaria);

module.exports = router;
