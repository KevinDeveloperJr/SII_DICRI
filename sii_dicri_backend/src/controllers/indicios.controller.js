// src/controllers/indicios.controller.js
const { getPool, sql } = require('../config/db');

// POST /api/indicios - crear indicio para un expediente
async function crearIndicio(req, res) {
  try {
    const {
      idExpediente,
      nombre,
      descripcion,
      color,
      tamano,
      peso,
      ubicacion,
    } = req.body;

    const userId = req.user.sub; // Id de usuario desde token

    if (!idExpediente || !nombre) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Id del expediente y nombre del indicio son obligatorios.',
      });
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input('IdExpediente', sql.Int, idExpediente)
      .input('Nombre', sql.VarChar(150), nombre)
      .input('Descripcion', sql.VarChar(500), descripcion || null)
      .input('Color', sql.VarChar(50), color || null)
      .input('Tamano', sql.VarChar(50), tamano || null)
      .input(
        'Peso',
        sql.Decimal(10, 2),
        peso === '' || peso === null || peso === undefined
          ? null
          : Number(String(peso).replace(',', '.'))
      )
      .input('Ubicacion', sql.VarChar(200), ubicacion || null)
      .input('IdUsuarioAccion', sql.Int, userId)
      .execute('sp_crear_indicio');

    const idIndicio =
      result.recordset?.[0]?.IdIndicio ?? result.recordset?.[0]?.idIndicio;

    return res.status(201).json({
      ok: true,
      mensaje: 'Indicio creado',
      idIndicio,
    });
  } catch (err) {
    console.error('Error crearIndicio:', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al crear indicio.' });
  }
}

// PUT /api/indicios/:id - actualizar indicio
async function actualizarIndicio(req, res) {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res
      .status(400)
      .json({ ok: false, mensaje: 'Id de indicio inválido.' });
  }

  try {
    const {
      nombre,
      descripcion,
      color,
      tamano,
      peso,
      ubicacion,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del indicio es obligatorio.',
      });
    }

    const pool = await getPool();

    await pool
      .request()
      .input('IdIndicio', sql.Int, id)
      .input('Nombre', sql.VarChar(150), nombre)
      .input('Descripcion', sql.VarChar(500), descripcion || null)
      .input('Color', sql.VarChar(50), color || null)
      .input('Tamano', sql.VarChar(50), tamano || null)
      .input(
        'Peso',
        sql.Decimal(10, 2),
        peso === '' || peso === null || peso === undefined
          ? null
          : Number(String(peso).replace(',', '.'))
      )
      .input('Ubicacion', sql.VarChar(200), ubicacion || null)
      .input('IdUsuarioAccion', sql.Int, req.user.sub)
      .execute('sp_actualizar_indicio');

    return res.json({
      ok: true,
      mensaje: 'Indicio actualizado',
    });
  } catch (err) {
    console.error('Error actualizarIndicio:', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al actualizar indicio.' });
  }
}

// DELETE /api/indicios/:id - eliminación lógica de indicio
async function eliminarIndicio(req, res) {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res
      .status(400)
      .json({ ok: false, mensaje: 'Id de indicio inválido.' });
  }

  try {
    const pool = await getPool();

    await pool
      .request()
      .input('IdIndicio', sql.Int, id)
      .input('IdUsuarioAccion', sql.Int, req.user.sub)
      .execute('sp_eliminar_indicio');

    return res.json({
      ok: true,
      mensaje: 'Indicio eliminado',
    });
  } catch (err) {
    console.error('Error eliminarIndicio:', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al eliminar indicio.' });
  }
}

module.exports = {
  crearIndicio,
  actualizarIndicio,
  eliminarIndicio,
};
