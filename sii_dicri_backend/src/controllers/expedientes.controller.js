// src/controllers/expedientes.controller.js
const { getPool, sql } = require('../config/db');

// GET /api/expedientes - lista expedientes con filtros opcionales
async function listarExpedientes(req, res) {
  const { estado, fechaInicio, fechaFin } = req.query;

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('EstadoCodigo', sql.VarChar(30), estado || null)
      .input('FechaInicio', sql.Date, fechaInicio || null)
      .input('FechaFin', sql.Date, fechaFin || null)
      .execute('sp_listar_expedientes');

    res.json({ ok: true, expedientes: result.recordset });
  } catch (err) {
    console.error('Error listando expedientes:', err);
    res
      .status(500)
      .json({ ok: false, mensaje: 'Error al listar expedientes' });
  }
}

// POST /api/expedientes - crea expediente (SP: sp_crear_expediente)
async function crearExpediente(req, res) {
  try {
    const { descripcion, idFiscalia, idTipoCaso, fechaHecho } = req.body;
    const userId = req.user.sub;

    if (!descripcion || !idFiscalia || !idTipoCaso || !fechaHecho) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Todos los campos son obligatorios.',
      });
    }

    const pool = await getPool();

    // Nombre de fiscalía desde SP sp_fiscalias_obtener_por_id (debe filtrar Activo=1)
    const r1 = await pool
      .request()
      .input('IdFiscalia', sql.Int, idFiscalia)
      .execute('sp_fiscalias_obtener_por_id');
    const fiscaliaNombre = r1.recordset[0]?.Nombre || null;

    // Nombre de tipo de caso desde SP sp_tipos_caso_obtener_por_id (debe filtrar Activo=1)
    const r2 = await pool
      .request()
      .input('IdTipoCaso', sql.Int, idTipoCaso)
      .execute('sp_tipos_caso_obtener_por_id');
    const tipoCasoNombre = r2.recordset[0]?.Nombre || null;

    const result = await pool
      .request()
      .input('Titulo', sql.VarChar(200), descripcion)
      .input('Fiscalia', sql.VarChar(150), fiscaliaNombre)
      .input('TipoCaso', sql.VarChar(100), tipoCasoNombre)
      .input('FechaHecho', sql.Date, fechaHecho)
      .input('IdUsuarioAccion', sql.Int, userId)
      .output('IdExpediente', sql.Int)
      .output('NumeroGenerado', sql.VarChar(50))
      .execute('sp_crear_expediente');

    const idExpediente = result.output.IdExpediente;
    const numeroExpediente = result.output.NumeroGenerado;

    return res.status(201).json({
      ok: true,
      mensaje: 'Expediente creado correctamente.',
      idExpediente,
      numeroExpediente,
    });
  } catch (err) {
    console.error('Error crearExpediente', err);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al crear expediente',
    });
  }
}

// GET /api/expedientes/:id - detalle de expediente + indicios
async function obtenerExpedienteDetalle(req, res) {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Id de expediente inválido',
    });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input('IdExpediente', sql.Int, id)
      .execute('sp_obtener_expediente_detalle');

    const expediente = result.recordsets?.[0]?.[0] || null;
    const indicios = result.recordsets?.[1] || [];

    if (!expediente) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Expediente no encontrado',
      });
    }

    res.json({ ok: true, expediente, indicios });
  } catch (err) {
    console.error('Error obteniendo expediente:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener expediente',
    });
  }
}

// PUT /api/expedientes/:id/estado - cambio de estado (BORRADOR/REVISION/APROBADO/RECHAZADO)
async function cambiarEstadoExpediente(req, res) {
  const id = parseInt(req.params.id, 10);
  const { nuevoEstado, justificacion } = req.body;

  if (Number.isNaN(id) || !nuevoEstado) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Id y nuevoEstado son obligatorios',
    });
  }

  try {
    const pool = await getPool();

    await pool
      .request()
      .input('IdExpediente', sql.Int, id)
      .input('NuevoEstadoCodigo', sql.VarChar(30), nuevoEstado)
      .input('IdUsuarioAccion', sql.Int, req.user.sub)
      .input('Justificacion', sql.VarChar(500), justificacion || null)
      .execute('sp_cambiar_estado_expediente');

    res.json({
      ok: true,
      mensaje: 'Estado actualizado correctamente',
    });
  } catch (err) {
    console.error('Error cambiando estado de expediente:', err);
    res.status(400).json({
      ok: false,
      mensaje: err.message,
    });
  }
}

// PUT /api/expedientes/:id - actualizar datos básicos del expediente
async function actualizarExpediente(req, res) {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Id de expediente inválido',
    });
  }

  const { descripcion, idFiscalia, idTipoCaso, fechaHecho } = req.body;

  if (!descripcion || !idFiscalia || !idTipoCaso || !fechaHecho) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Todos los campos son obligatorios.',
    });
  }

  try {
    const pool = await getPool();

    // Nombre de fiscalía desde SP sp_fiscalias_obtener_por_id (debe filtrar Activo=1)
    const r1 = await pool
      .request()
      .input('IdFiscalia', sql.Int, idFiscalia)
      .execute('sp_fiscalias_obtener_por_id');
    const fiscaliaNombre = r1.recordset[0]?.Nombre || null;

    // Nombre de tipo de caso desde SP sp_tipos_caso_obtener_por_id (debe filtrar Activo=1)
    const r2 = await pool
      .request()
      .input('IdTipoCaso', sql.Int, idTipoCaso)
      .execute('sp_tipos_caso_obtener_por_id');
    const tipoCasoNombre = r2.recordset[0]?.Nombre || null;

    await pool
      .request()
      .input('IdExpediente', sql.Int, id)
      .input('Titulo', sql.VarChar(200), descripcion)
      .input('Fiscalia', sql.VarChar(150), fiscaliaNombre)
      .input('TipoCaso', sql.VarChar(100), tipoCasoNombre)
      .input('FechaHecho', sql.Date, fechaHecho)
      .input('IdUsuarioAccion', sql.Int, req.user.sub)
      .execute('sp_actualizar_expediente');

    return res.json({
      ok: true,
      mensaje: 'Expediente actualizado correctamente.',
    });
  } catch (err) {
    console.error('Error actualizando expediente:', err);
    return res.status(400).json({
      ok: false,
      mensaje: err.message || 'Error al actualizar expediente',
    });
  }
}

// DELETE /api/expedientes/:id - elimina (lógico) expediente
async function eliminarExpediente(req, res) {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Id de expediente inválido',
    });
  }

  try {
    const pool = await getPool();

    await pool
      .request()
      .input('IdExpediente', sql.Int, id)
      .input('IdUsuarioAccion', sql.Int, req.user.sub)
      .execute('sp_eliminar_expediente');

    return res.json({
      ok: true,
      mensaje: 'Expediente eliminado correctamente.',
    });
  } catch (err) {
    console.error('Error eliminando expediente:', err);
    return res.status(400).json({
      ok: false,
      mensaje: err.message || 'Error al eliminar expediente',
    });
  }
}

module.exports = {
  listarExpedientes,
  crearExpediente,
  obtenerExpedienteDetalle,
  cambiarEstadoExpediente,
  actualizarExpediente,
  eliminarExpediente,
};
