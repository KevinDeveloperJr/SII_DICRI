// src/routes/catalogos.routes.js
// Rutas de catálogos (fiscalías, tipos de caso)
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const {
  listarFiscalias,
  listarTiposCaso,
} = require('../controllers/catalogos.controller');

// Todas las rutas de catálogos requieren autenticación
router.use(requireAuth);

// GET /api/catalogos/fiscalias - lista fiscalías activas
router.get('/fiscalias', listarFiscalias);

// GET /api/catalogos/tipos-caso - lista tipos de caso activos
router.get('/tipos-caso', listarTiposCaso);

module.exports = router;
