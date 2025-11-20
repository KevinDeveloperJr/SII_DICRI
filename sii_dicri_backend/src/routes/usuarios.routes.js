// src/routes/usuarios.routes.js
// Rutas de administración de usuarios y roles
const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const {
  listarUsuarios,
  listarRoles,
  crearUsuario,
  actualizarUsuario,
} = require('../controllers/usuarios.controller');

// GET /api/usuarios - listado de usuarios (solo ADMIN)
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  listarUsuarios
);

// GET /api/usuarios/roles - listado de roles (solo ADMIN)
router.get(
  '/roles',
  requireAuth,
  requireRole('ADMIN'),
  listarRoles
);

// POST /api/usuarios - crear usuario (solo ADMIN)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  crearUsuario
);

// PUT /api/usuarios/:id - actualizar usuario (solo ADMIN)
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  actualizarUsuario
);

module.exports = router;
