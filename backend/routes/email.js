'use strict';

const router = require('express').Router();
const { enviarRelatorioPortaria } = require('../controllers/emailController');

// POST /api/email/relatorio-portaria
router.post('/relatorio-portaria', enviarRelatorioPortaria);

module.exports = router;
