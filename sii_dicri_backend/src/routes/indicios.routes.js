// src/routes/indicios.routes.js
// Rutas para gestión de indicios de los expedientes
const express = require('express');
const router = express.Router();

const {
  crearIndicio,
  actualizarIndicio,
  eliminarIndicio,
} = require('../controllers/indicios.controller');

const { requireAuth } = require('../middlewares/auth.middleware');

// POST /api/indicios - crear nuevo indicio
router.post('/', requireAuth, crearIndicio);

// PUT /api/indicios/:id - actualizar indicio existente
router.put('/:id', requireAuth, actualizarIndicio);

// DELETE /api/indicios/:id - eliminación lógica de indicio
router.delete('/:id', requireAuth, eliminarIndicio);

module.exports = router;
