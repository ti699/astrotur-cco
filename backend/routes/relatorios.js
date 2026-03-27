const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, (req, res) => {
  res.json({ message: 'Rota de relatorios' });
});

module.exports = router;
