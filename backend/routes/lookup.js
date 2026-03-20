const router = require('express').Router();
const {
  getUsuarios,
  getPlantonistas,
  getVeiculos,
  getMotoristas,
  getClientes,
} = require('../controllers/lookupController');

router.get('/usuarios',     getUsuarios);
router.get('/plantonistas', getPlantonistas);
router.get('/veiculos',     getVeiculos);
router.get('/motoristas',   getMotoristas);
router.get('/clientes',     getClientes);

module.exports = router;
