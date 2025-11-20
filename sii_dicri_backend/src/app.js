// src/app.js - Configura Express y registra las rutas de la API SII_DICRI
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const expedientesRoutes = require('./routes/expedientes.routes');
const catalogosRoutes = require('./routes/catalogos.routes');
const indiciosRoutes = require('./routes/indicios.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();

// Habilita CORS y parseo de JSON en el body
app.use(cors());
app.use(express.json());

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de gestión de expedientes
app.use('/api/expedientes', expedientesRoutes);

// Rutas de catálogos (fiscalías, tipos de caso)
app.use('/api/catalogos', catalogosRoutes);

// Rutas de indicios asociados a expedientes
app.use('/api/indicios', indiciosRoutes);

// Rutas de administración de usuarios y roles
app.use('/api/usuarios', usuariosRoutes);

module.exports = app;
