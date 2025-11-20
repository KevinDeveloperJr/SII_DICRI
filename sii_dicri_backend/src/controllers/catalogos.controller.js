// src/controllers/catalogos.controller.js
// Catálogos generales (fiscalías, tipos de caso)
const { executeProcedure } = require('../config/db');

async function listarFiscalias(req, res) {
  try {
    // Lista fiscalías desde SP sp_fiscalias_listar
    const result = await executeProcedure('sp_fiscalias_listar');

    return res.json({
      ok: true,
      fiscalias: result.recordset,
    });
  } catch (err) {
    console.error('Error listarFiscalias', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al obtener fiscalías' });
  }
}

async function listarTiposCaso(req, res) {
  try {
    // Lista tipos de caso desde SP sp_tipos_caso_listar
    const result = await executeProcedure('sp_tipos_caso_listar');

    return res.json({
      ok: true,
      tiposCaso: result.recordset,
    });
  } catch (err) {
    console.error('Error listarTiposCaso', err);
    return res
      .status(500)
      .json({ ok: false, mensaje: 'Error al obtener tipos de caso' });
  }
}

module.exports = {
  listarFiscalias,
  listarTiposCaso,
};
