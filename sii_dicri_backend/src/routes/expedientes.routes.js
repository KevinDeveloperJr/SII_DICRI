// src/routes/expedientes.routes.js
// Rutas de gestión de expedientes
const express = require('express');
const router = express.Router();

const {
  listarExpedientes,
  crearExpediente,
  obtenerExpedienteDetalle,
  cambiarEstadoExpediente,
  actualizarExpediente,
  eliminarExpediente,
} = require('../controllers/expedientes.controller');

const { requireAuth } = require('../middlewares/auth.middleware');

// GET /api/expedientes - listado de expedientes con filtros
router.get('/', requireAuth, listarExpedientes);

// POST /api/expedientes - crear nuevo expediente
router.post('/', requireAuth, crearExpediente);

// GET /api/expedientes/:id - detalle de expediente e indicios
router.get('/:id', requireAuth, obtenerExpedienteDetalle);

// PUT /api/expedientes/:id - actualizar datos del expediente
router.put('/:id', requireAuth, actualizarExpediente);

// PUT /api/expedientes/:id/estado - cambiar estado de expediente
router.put('/:id/estado', requireAuth, cambiarEstadoExpediente);

// DELETE /api/expedientes/:id - eliminación lógica del expediente
router.delete('/:id', requireAuth, eliminarExpediente);

module.exports = router;
