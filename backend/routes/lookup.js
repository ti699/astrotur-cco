const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getUsuarios,
  getPlantonistas,
  getVeiculos,
  getMotoristas,
  getClientes,
} = require('../controllers/lookupController');

router.get('/usuarios',     authenticateToken, getUsuarios);
router.get('/plantonistas', authenticateToken, getPlantonistas);
router.get('/veiculos',     authenticateToken, getVeiculos);
router.get('/motoristas',   authenticateToken, getMotoristas);
router.get('/clientes',     authenticateToken, getClientes);

module.exports = router;
