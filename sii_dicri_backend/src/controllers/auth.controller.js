// src/controllers/auth.controller.js
const { executeProcedure } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Login de usuario usando SP y JWT
async function login(req, res) {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Usuario y contraseña son obligatorios',
    });
  }

  try {
    // Usuario por nombre (SP: sp_usuarios_obtener_por_usuario)
    const userResult = await executeProcedure(
      'sp_usuarios_obtener_por_usuario',
      { Usuario: usuario }
    );

    const dbUser = userResult.recordset?.[0];

    if (!dbUser || dbUser.Activo === 0) {
      return res
        .status(401)
        .json({ ok: false, mensaje: 'Credenciales inválidas' });
    }

    // Validar contraseña (bcrypt + compatibilidad texto plano)
    const hashEnBD = dbUser.Contrasena || '';
    let passwordOk = false;

    if (hashEnBD) {
      try {
        passwordOk = await bcrypt.compare(contrasena, hashEnBD);
      } catch (e) {
        console.warn('Hash no válido como bcrypt, probando texto plano...');
      }
      if (!passwordOk) passwordOk = contrasena === hashEnBD;
    }

    if (!passwordOk) {
      return res
        .status(401)
        .json({ ok: false, mensaje: 'Credenciales inválidas' });
    }

    // Roles del usuario (SP: sp_usuariorol_listar_por_usuario)
    const rolesResult = await executeProcedure(
      'sp_usuariorol_listar_por_usuario',
      { IdUsuario: dbUser.IdUsuario }
    );

    const rolesRaw = rolesResult.recordset || [];

    // Solo roles activos en mayúsculas y sin espacios
    const roles = rolesRaw
      .filter((r) => r.Activo)
      .map((r) => String(r.Nombre).trim().toUpperCase());

    const payload = {
      sub: dbUser.IdUsuario,
      usuario: dbUser.Usuario,
      nombres: `${dbUser.PrimerNombre || ''} ${
        dbUser.PrimerApellido || ''
      }`.trim(),
      roles,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    return res.json({
      ok: true,
      token,
      usuario: payload,
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error en el servidor' });
  }
}

module.exports = { login };
