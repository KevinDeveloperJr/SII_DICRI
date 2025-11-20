// src/routes/auth.routes.js
// Rutas de autenticación (login)
const express = require('express');
const router = express.Router();

const { login } = require('../controllers/auth.controller');

// POST /api/auth/login - inicio de sesión y emisión de token
router.post('/login', login);

module.exports = router;
