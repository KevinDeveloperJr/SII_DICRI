// src/controllers/usuarios.controller.js
const { getPool, sql } = require('../config/db');
const bcrypt = require('bcryptjs');

// Valida complejidad mínima de la contraseña
function validarContrasena(contra = '') {
  const pwd = String(contra);

  if (pwd.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }

  const tieneLetra = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(pwd);
  const tieneNumero = /[0-9]/.test(pwd);

  if (!tieneLetra || !tieneNumero) {
    return 'La contraseña debe incluir al menos una letra y un número.';
  }

  return null;
}

// GET /api/usuarios - lista usuarios con filtros de búsqueda/estado
async function listarUsuarios(req, res) {
  const { search = '', estado = 'Activos' } = req.query;

  // null = todos, 1 = activos, 0 = inactivos
  let soloActivos = null;
  if (estado === 'Activos') soloActivos = 1;
  else if (estado === 'Inactivos') soloActivos = 0;

  try {
    const pool = await getPool();
    const request = pool.request();

    request.input('Search', sql.VarChar(200), search ? search : null);
    request.input('SoloActivos', sql.Bit, soloActivos);

    const result = await request.execute('sp_usuarios_listar');

    return res.json({
      ok: true,
      usuarios: result.recordset || [],
    });
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al listar usuarios' });
  }
}

// GET /api/usuarios/roles - lista roles desde SP
async function listarRoles(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().execute('sp_roles_listar');

    return res.json({
      ok: true,
      roles: result.recordset || [],
    });
  } catch (err) {
    console.error('Error al listar roles:', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al listar roles' });
  }
}

// POST /api/usuarios - crea usuario y asigna roles usando SPs
async function crearUsuario(req, res) {
  let {
    usuario,
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    email,
    contrasena,
    roles,
  } = req.body;

  // Normalizar strings
  usuario = (usuario || '').trim();
  primerNombre = (primerNombre || '').trim();
  segundoNombre = (segundoNombre || '').trim();
  primerApellido = (primerApellido || '').trim();
  segundoApellido = (segundoApellido || '').trim();
  email = (email || '').trim();

  // Validaciones de obligatorios
  if (!usuario || !primerNombre || !primerApellido || !email || !contrasena) {
    return res.status(400).json({
      ok: false,
      mensaje:
        'Usuario, primer nombre, primer apellido, correo y contraseña son obligatorios',
    });
  }

  // Validar complejidad de contraseña
  const errorPwd = validarContrasena(contrasena);
  if (errorPwd) {
    return res.status(400).json({
      ok: false,
      mensaje: errorPwd,
    });
  }

  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Debe asignar al menos un rol',
    });
  }

  try {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      // Hashear contraseña antes de guardar
      const hash = await bcrypt.hash(contrasena, 10);

      // Id del usuario que realiza la acción (ADMIN logueado)
      const idUsuarioAccion =
        req.user && req.user.sub ? Number(req.user.sub) : null;

      // Crear usuario vía SP sp_usuarios_crear
      const reqUser = new sql.Request(tx);
      const resultUser = await reqUser
        .input('Usuario', sql.VarChar(50), usuario)
        .input('PrimerNombre', sql.VarChar(50), primerNombre || null)
        .input('SegundoNombre', sql.VarChar(50), segundoNombre || null)
        .input('PrimerApellido', sql.VarChar(50), primerApellido || null)
        .input('SegundoApellido', sql.VarChar(50), segundoApellido || null)
        .input('Email', sql.VarChar(150), email || null)
        .input('Contrasena', sql.VarChar(255), hash)
        .input('IdUsuarioAccion', sql.Int, idUsuarioAccion)
        .execute('sp_usuarios_crear');

      const nuevoId = resultUser.recordset[0].IdUsuario;

      // Asignar roles vía SP sp_usuariorol_asignar dentro de la misma TX
      for (const idRol of roles) {
        const reqRol = new sql.Request(tx);
        await reqRol
          .input('IdUsuario', sql.Int, nuevoId)
          .input('IdRol', sql.Int, idRol)
          .input('IdUsuarioAccion', sql.Int, idUsuarioAccion)
          .execute('sp_usuariorol_asignar');
      }

      await tx.commit();

      return res.status(201).json({
        ok: true,
        mensaje: 'Usuario creado correctamente',
        idUsuario: nuevoId,
      });
    } catch (errTx) {
      await tx.rollback();

      if (
        errTx &&
        errTx.message &&
        errTx.message.includes(
          'Ya existe un usuario activo con ese nombre de usuario.'
        )
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            'Ya existe un usuario activo con ese nombre de usuario.',
        });
      }

      console.error('Error en transacción crearUsuario:', errTx);
      return res
        .status(500)
        .json({ ok: false, mensaje: 'Error al crear el usuario' });
    }
  } catch (err) {
    console.error('Error general crearUsuario:', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al crear el usuario' });
  }
}

// PUT /api/usuarios/:id - actualiza datos, estado y roles usando SPs
async function actualizarUsuario(req, res) {
  const { id } = req.params;

  let {
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    email,
    activo,
    roles,
    contrasena,
  } = req.body;

  // Normalizar
  primerNombre = (primerNombre || '').trim();
  segundoNombre = (segundoNombre || '').trim();
  primerApellido = (primerApellido || '').trim();
  segundoApellido = (segundoApellido || '').trim();
  email = (email || '').trim();

  // Validaciones mínimas
  if (!primerNombre || !primerApellido || !email) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Primer nombre, primer apellido y correo son obligatorios',
    });
  }

  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Debe asignar al menos un rol',
    });
  }

  // Si viene contraseña, validar complejidad
  let hash = null;
  if (contrasena) {
    const errorPwd = validarContrasena(contrasena);
    if (errorPwd) {
      return res.status(400).json({
        ok: false,
        mensaje: errorPwd,
      });
    }
    hash = await bcrypt.hash(contrasena, 10);
  }

  // normalizar activo a bit
  const activoBit =
    activo === true || activo === 1 || activo === '1' ? 1 : 0;

  try {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      // Usuario que realiza la acción
      const idUsuarioAccion =
        req.user && req.user.sub ? Number(req.user.sub) : null;

      // Actualizar datos del usuario vía SP sp_usuarios_actualizar
      const reqUser = new sql.Request(tx);
      await reqUser
        .input('IdUsuario', sql.Int, id)
        .input('PrimerNombre', sql.VarChar(50), primerNombre || null)
        .input('SegundoNombre', sql.VarChar(50), segundoNombre || null)
        .input('PrimerApellido', sql.VarChar(50), primerApellido || null)
        .input('SegundoApellido', sql.VarChar(50), segundoApellido || null)
        .input('Email', sql.VarChar(150), email || null)
        .input('Activo', sql.Bit, activoBit)
        .input('Contrasena', sql.VarChar(255), hash || null)
        .input('IdUsuarioAccion', sql.Int, idUsuarioAccion)
        .execute('sp_usuarios_actualizar');

      // Eliminar roles actuales vía SP sp_usuariorol_eliminar_por_usuario
      const reqDel = new sql.Request(tx);
      await reqDel
        .input('IdUsuario', sql.Int, id)
        .input('IdUsuarioAccion', sql.Int, idUsuarioAccion)
        .execute('sp_usuariorol_eliminar_por_usuario');

      // Volver a asignar roles vía SP sp_usuariorol_asignar
      for (const idRol of roles) {
        const reqRol = new sql.Request(tx);
        await reqRol
          .input('IdUsuario', sql.Int, id)
          .input('IdRol', sql.Int, idRol)
          .input('IdUsuarioAccion', sql.Int, idUsuarioAccion)
          .execute('sp_usuariorol_asignar');
      }

      await tx.commit();

      return res.json({
        ok: true,
        mensaje: 'Usuario actualizado correctamente',
      });
    } catch (errTx) {
      await tx.rollback();
      console.error('Error en transacción actualizarUsuario:', errTx);
      return res
        .status(500)
        .json({ ok: false, mensaje: 'Error al actualizar el usuario' });
    }
  } catch (err) {
    console.error('Error general actualizarUsuario:', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al actualizar el usuario' });
  }
}

module.exports = {
  listarUsuarios,
  listarRoles,
  crearUsuario,
  actualizarUsuario,
};
