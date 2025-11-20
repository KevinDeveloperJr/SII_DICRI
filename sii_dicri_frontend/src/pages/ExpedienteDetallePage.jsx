// src/pages/ExpedienteDetallePage.jsx - Detalle de expediente + gestión de indicios
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Convierte una fecha (string/Date) a Date en local sin zona horaria
function toLocalDate(fecha) {
  if (!fecha) return null;

  if (fecha instanceof Date) {
    return new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );
  }

  if (typeof fecha === 'string') {
    const s = fecha.slice(0, 10);
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  return null;
}

// Convierte fecha a formato yyyy-mm-dd para <input type="date" />
function toDateInputValue(fechaStr) {
  const d = toLocalDate(fechaStr);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Devuelve fecha en formato dd/mm/yyyy (para PDF)
function formatFecha(fechaStr) {
  const d = toLocalDate(fechaStr);
  if (!d) return '';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export default function ExpedienteDetallePage() {
  const { id } = useParams(); // IdExpediente en la URL
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [expediente, setExpediente] = useState(null);
  const [indicios, setIndicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Catálogos
  const [fiscalias, setFiscalias] = useState([]);
  const [tiposCaso, setTiposCaso] = useState([]);

  // Formulario de datos del expediente
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [idFiscaliaEdit, setIdFiscaliaEdit] = useState('');
  const [idTipoCasoEdit, setIdTipoCasoEdit] = useState('');
  const [fechaHechoEdit, setFechaHechoEdit] = useState('');
  const [savingExpediente, setSavingExpediente] = useState(false);
  const [expedienteMsg, setExpedienteMsg] = useState('');

  // Mensajes para indicios
  const [indiciosMsg, setIndiciosMsg] = useState('');
  const [indiciosMsgType, setIndiciosMsgType] = useState('success'); // 'success' | 'error'

  // Modal de indicios
  const [showIndicioModal, setShowIndicioModal] = useState(false);
  const [editingIndicio, setEditingIndicio] = useState(null);
  const [indicioForm, setIndicioForm] = useState({
    nombre: '',
    descripcion: '',
    color: '',
    tamano: '',
    peso: '',
    ubicacion: '',
  });
  const [savingIndicio, setSavingIndicio] = useState(false);
  const [indicioError, setIndicioError] = useState('');

  // ===== ROLES DEL USUARIO (para permisos en la página) =====
  const rolesArrayRaw = Array.isArray(user?.roles) ? user.roles : [];

  const rolesNormalizados = rolesArrayRaw
    .map((r) => {
      if (typeof r === 'string') return r.toUpperCase();
      if (r && typeof r === 'object') {
        return String(r.Nombre || r.name || r.rol || '').toUpperCase();
      }
      return '';
    })
    .filter(Boolean);

  const idRolPrincipal =
    user?.IdRolPrincipal ??
    user?.IdRol ??
    user?.idRolPrincipal ??
    null;

  const rolNombrePrincipal = (
    user?.RolNombre ||
    user?.rolNombre ||
    ''
  ).toUpperCase();

  if (rolNombrePrincipal && !rolesNormalizados.includes(rolNombrePrincipal)) {
    rolesNormalizados.push(rolNombrePrincipal);
  }

  const esTecnico =
    rolesNormalizados.includes('TECNICO') || idRolPrincipal === 1;
  const esCoordinador =
    rolesNormalizados.includes('COORDINADOR') || idRolPrincipal === 2;
  const esAdmin =
    rolesNormalizados.includes('ADMIN') || idRolPrincipal === 3;

  // Cargar detalle del expediente
  useEffect(() => {
    if (!token) return;
    cargarDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  // Cargar catálogos de fiscalías y tipos de caso
  useEffect(() => {
    if (!token) return;
    async function cargarCatalogos() {
      try {
        const [respFiscalias, respTipos] = await Promise.all([
          apiFetch('/api/catalogos/fiscalias', { token }),
          apiFetch('/api/catalogos/tipos-caso', { token }),
        ]);
        setFiscalias(respFiscalias.fiscalias || []);
        setTiposCaso(respTipos.tiposCaso || []);
      } catch (err) {
        console.error('Error cargando catálogos en detalle:', err);
      }
    }
    cargarCatalogos();
  }, [token]);

  // Muestra un mensaje temporal (toast) para acciones de indicios
  function showIndiciosMsg(msg, type = 'success') {
    setIndiciosMsg(msg);
    setIndiciosMsgType(type);
    setTimeout(() => {
      setIndiciosMsg('');
    }, 3000);
  }

  // Llama a /api/expedientes/:id para cargar expediente + indicios
  async function cargarDetalle() {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch(`/api/expedientes/${id}`, { token });
      setExpediente(data.expediente);
      setIndicios(data.indicios || []);
    } catch (err) {
      setError(err.message || 'Error al cargar el expediente.');
    } finally {
      setLoading(false);
    }
  }

  // Rellena el formulario de edición cuando ya tenemos expediente + catálogos
  useEffect(() => {
    if (!expediente) return;

    setDescripcionEdit(expediente.Titulo || '');

    const fechaBase = expediente.FechaHecho || expediente.FechaCreacion;
    setFechaHechoEdit(toDateInputValue(fechaBase));

    if (fiscalias.length > 0) {
      const fiscaliaMatch = fiscalias.find(
        (f) => f.Nombre === expediente.Fiscalia
      );
      setIdFiscaliaEdit(fiscaliaMatch ? String(fiscaliaMatch.IdFiscalia) : '');
    }

    if (tiposCaso.length > 0) {
      const tipoMatch = tiposCaso.find(
        (t) => t.Nombre === expediente.TipoCaso
      );
      setIdTipoCasoEdit(tipoMatch ? String(tipoMatch.IdTipoCaso) : '');
    }
  }, [expediente, fiscalias, tiposCaso]);

  // Oculta mensaje de "Datos actualizados" luego de unos segundos
  useEffect(() => {
    if (!expedienteMsg) return;
    const timer = setTimeout(() => {
      setExpedienteMsg('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [expedienteMsg]);

  // ===== MODAL INDICIOS =====
  function abrirNuevoIndicio() {
    setEditingIndicio(null);
    setIndicioForm({
      nombre: '',
      descripcion: '',
      color: '',
      tamano: '',
      peso: '',
      ubicacion: '',
    });
    setIndicioError('');
    setShowIndicioModal(true);
  }

  function abrirEditarIndicio(indicio) {
    setEditingIndicio(indicio);
    setIndicioForm({
      nombre: indicio.Nombre || '',
      descripcion: indicio.Descripcion || '',
      color: indicio.Color || '',
      tamano: indicio.Tamano || '',
      peso:
        indicio.Peso !== null && indicio.Peso !== undefined
          ? String(indicio.Peso)
          : '',
      ubicacion: indicio.Ubicacion || '',
    });
    setIndicioError('');
    setShowIndicioModal(true);
  }

  function cerrarIndicioModal() {
    setShowIndicioModal(false);
    setEditingIndicio(null);
    setIndicioError('');
  }

  function handleIndicioChange(e) {
    const { name, value } = e.target;
    setIndicioForm((prev) => ({ ...prev, [name]: value }));
  }

  // Crear o actualizar indicio usando /api/indicios
  async function handleGuardarIndicio(e) {
    e.preventDefault();
    setIndicioError('');

    if (!indicioForm.nombre.trim()) {
      setIndicioError('El nombre es obligatorio.');
      return;
    }

    try {
      setSavingIndicio(true);

      const payload = {
        idExpediente: expediente.IdExpediente,
        nombre: indicioForm.nombre.trim(),
        descripcion: indicioForm.descripcion.trim() || null,
        color: indicioForm.color.trim() || null,
        tamano: indicioForm.tamano ? indicioForm.tamano.trim() : null,
        peso:
          indicioForm.peso === ''
            ? null
            : Number(indicioForm.peso.replace(',', '.')),
        ubicacion: indicioForm.ubicacion.trim() || null,
      };

      if (editingIndicio) {
        await apiFetch(`/api/indicios/${editingIndicio.IdIndicio}`, {
          method: 'PUT',
          token,
          body: payload,
        });
        showIndiciosMsg('Indicio actualizado correctamente.', 'success');
      } else {
        await apiFetch('/api/indicios', {
          method: 'POST',
          token,
          body: payload,
        });
        showIndiciosMsg('Indicio creado correctamente.', 'success');
      }

      await cargarDetalle();
      cerrarIndicioModal();
    } catch (err) {
      const msg = err.message || 'Error al guardar el indicio.';
      setIndicioError(msg);
      showIndiciosMsg(msg, 'error');
    } finally {
      setSavingIndicio(false);
    }
  }

  // Eliminar indicio (DELETE /api/indicios/:id)
  async function handleEliminarIndicio(indicio) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar el indicio "${indicio.Nombre}"?`
    );
    if (!confirmar) return;

    try {
      await apiFetch(`/api/indicios/${indicio.IdIndicio}`, {
        method: 'DELETE',
        token,
      });
      await cargarDetalle();
      showIndiciosMsg('Indicio eliminado correctamente.', 'success');
    } catch (err) {
      const msg = err.message || 'Error al eliminar el indicio.';
      alert(msg);
      showIndiciosMsg(msg, 'error');
    }
  }

  // ===== CAMBIO DE ESTADO DEL EXPEDIENTE =====
  async function cambiarEstado(nuevoEstadoCodigo, extraBody = {}) {
    try {
      await apiFetch(`/api/expedientes/${id}/estado`, {
        method: 'PUT',
        token,
        body: { nuevoEstado: nuevoEstadoCodigo, ...extraBody },
      });
      await cargarDetalle();
    } catch (err) {
      alert(err.message || 'Error al cambiar el estado.');
    }
  }

  // Rechazo: pasa de REVISION a RECHAZADO con justificación
  async function handleRechazar() {
    const motivo = window.prompt('Ingrese la justificación del rechazo:');
    if (!motivo || !motivo.trim()) return;
    await cambiarEstado('RECHAZADO', { justificacion: motivo.trim() });
  }

  const numeroExpediente = expediente?.NumeroExpediente;
  const estadoCodigo = expediente?.EstadoCodigo; // BORRADOR / REVISION / APROBADO / RECHAZADO

  const motivoRechazo =
    expediente?.MotivoRechazo ||
    expediente?.JustificacionRechazo ||
    expediente?.Justificacion ||
    '';

  // Permisos para enviar a revisión
  const puedeEnviarRevision =
    (esTecnico || esAdmin) &&
    (estadoCodigo === 'BORRADOR' || estadoCodigo === 'RECHAZADO');

  // Permisos para editar datos del expediente
  const puedeEditarDatos =
    (estadoCodigo === 'BORRADOR' || estadoCodigo === 'RECHAZADO') &&
    !esCoordinador;

  // Permisos para gestionar indicios (Técnico/Admin en BORRADOR/RECHAZADO)
  const puedeGestionarIndicios =
    !esCoordinador &&
    (estadoCodigo === 'BORRADOR' || estadoCodigo === 'RECHAZADO');

  // ===== DESCARGAR PDF DEL EXPEDIENTE =====
  function handleDescargarPDF() {
    if (!expediente) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    const marginX = 40;
    let y = 40;

    const numero = expediente.NumeroExpediente || `#${id}`;
    const fechaBase = expediente.FechaHecho || expediente.FechaCreacion;
    const fechaHechoTexto = formatFecha(fechaBase);
    const estadoTexto = expediente.EstadoNombre || expediente.EstadoCodigo || '';

    doc.setFontSize(16);
    doc.text(`Expediente ${numero}`, marginX, y);
    y += 22;

    doc.setFontSize(11);
    doc.text(`Descripción: ${expediente.Titulo || ''}`, marginX, y); y += 16;
    doc.text(`Fiscalía: ${expediente.Fiscalia || ''}`, marginX, y); y += 16;
    doc.text(`Tipo de caso: ${expediente.TipoCaso || ''}`, marginX, y); y += 16;
    doc.text(`Fecha del hecho: ${fechaHechoTexto}`, marginX, y); y += 16;
    doc.text(`Estado: ${estadoTexto}`, marginX, y); y += 24;

    const bodyIndicios = (indicios || []).map((ind, index) => [
      index + 1,
      ind.Nombre || '',
      ind.Descripcion || '',
      ind.Color || '',
      ind.Tamano || '',
      ind.Peso != null ? `${ind.Peso} kg` : '',
      ind.Ubicacion || '',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Nombre', 'Descripción', 'Color', 'Tamaño', 'Peso', 'Ubicación']],
      body: bodyIndicios,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    const fileName = `${numero.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  }

  // Guarda cambios del expediente (PUT /api/expedientes/:id)
  async function handleGuardarDatosExpediente(e) {
    e.preventDefault();
    setError('');
    setExpedienteMsg('');

    if (
      !descripcionEdit ||
      !idFiscaliaEdit ||
      !idTipoCasoEdit ||
      !fechaHechoEdit
    ) {
      setError('Todos los campos marcados con * son obligatorios.');
      return;
    }

    try {
      setSavingExpediente(true);

      await apiFetch(`/api/expedientes/${id}`, {
        method: 'PUT',
        token,
        body: {
          descripcion: descripcionEdit,
          idFiscalia: Number(idFiscaliaEdit),
          idTipoCaso: Number(idTipoCasoEdit),
          fechaHecho: fechaHechoEdit,
        },
      });

      setExpedienteMsg('Datos del expediente actualizados correctamente.');
      await cargarDetalle();
    } catch (err) {
      setError(err.message || 'Error al actualizar el expediente.');
    } finally {
      setSavingExpediente(false);
    }
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page-content">
        {/* Header con título y botón atrás */}
        <div
          className="page-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h2>
            Detalle de expediente{' '}
            {numeroExpediente ? numeroExpediente : `#${id}`}
          </h2>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            ← Volver al listado
          </button>
        </div>

        {loading && <p>Cargando...</p>}
        {error && <p className="text-error">{error}</p>}

        {!loading && expediente && (
          <>
            {/* Información general + estado */}
            <section className="detail-grid">
              {/* Tarjeta de información general */}
              <div className="card">
                {/* Header de la tarjeta con botón PDF a la derecha */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ margin: 0 }}>Información general</h3>

                  <button
                    type="button"
                    onClick={handleDescargarPDF}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: 'none',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 0 0 1px rgba(22,163,74,0.4)',
                    }}
                  >
                    Descargar PDF
                  </button>
                </div>

                <form onSubmit={handleGuardarDatosExpediente}>
                  {/* DESCRIPCIÓN */}
                  <div className="form-group">
                    <label className="label">Descripción *</label>
                    <input
                      className="input"
                      value={descripcionEdit}
                      onChange={(e) => setDescripcionEdit(e.target.value)}
                      placeholder="Descripción breve del caso"
                      disabled={!puedeEditarDatos}
                    />
                  </div>

                  {/* FISCALÍA */}
                  <div className="form-group">
                    <label className="label">Fiscalía *</label>
                    <select
                      className="input"
                      value={idFiscaliaEdit}
                      onChange={(e) => setIdFiscaliaEdit(e.target.value)}
                      disabled={!puedeEditarDatos}
                    >
                      <option value="">Seleccione una fiscalía…</option>
                      {fiscalias.map((f) => (
                        <option key={f.IdFiscalia} value={f.IdFiscalia}>
                          {f.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* TIPO DE CASO */}
                  <div className="form-group">
                    <label className="label">Tipo de caso *</label>
                    <select
                      className="input"
                      value={idTipoCasoEdit}
                      onChange={(e) => setIdTipoCasoEdit(e.target.value)}
                      disabled={!puedeEditarDatos}
                    >
                      <option value="">Seleccione un tipo de caso…</option>
                      {tiposCaso.map((t) => (
                        <option key={t.IdTipoCaso} value={t.IdTipoCaso}>
                          {t.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FECHA DEL HECHO */}
                  <div className="form-group">
                    <label className="label">Fecha del hecho *</label>
                    <input
                      type="date"
                      className="input"
                      value={fechaHechoEdit}
                      onChange={(e) => setFechaHechoEdit(e.target.value)}
                      disabled={!puedeEditarDatos}
                    />
                  </div>

                  {!puedeEditarDatos && (
                    <p
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        opacity: 0.8,
                      }}
                    >
                      Los datos solo pueden modificarse cuando el expediente
                      está en estado <strong>BORRADOR</strong> o{' '}
                      <strong>RECHAZADO</strong>.
                    </p>
                  )}
                  {expedienteMsg && (
                    <p
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: '#4caf50',
                      }}
                    >
                      {expedienteMsg}
                    </p>
                  )}

                  {/* Botón único de guardar (se había duplicado) */}
                  {puedeEditarDatos && (
                    <div
                      style={{
                        marginTop: 16,
                        display: 'flex',
                        gap: 10,
                      }}
                    >
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingExpediente}
                      >
                        {savingExpediente
                          ? 'Guardando…'
                          : 'Guardar cambios del expediente'}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Tarjeta de estado */}
              <div className="card">
                <h3
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  Estado
                  <span
                    style={{
                      fontSize: 13,
                      padding: '2px 10px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(148,163,184,0.16)',
                      border: '1px solid rgba(148,163,184,0.35)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {expediente.EstadoNombre || expediente.EstadoCodigo}
                  </span>
                </h3>

                <p>
                  {estadoCodigo === 'BORRADOR' && (
                    <>
                      El expediente está en <strong>borrador</strong>, enviar
                      para su revisión.
                    </>
                  )}

                  {estadoCodigo === 'REVISION' && (
                    <>
                      El expediente está en <strong>revisión</strong> por un
                      coordinador.
                    </>
                  )}

                  {estadoCodigo === 'APROBADO' && (
                    <>
                      El expediente está <strong>aprobado</strong>.
                    </>
                  )}

                  {estadoCodigo === 'RECHAZADO' && (
                    <>
                      El expediente fue <strong>rechazado</strong>.
                    </>
                  )}
                </p>

                {/* Si quieres mostrar el motivo de rechazo, ya lo tienes en motivoRechazo */}
                {estadoCodigo === 'RECHAZADO' && motivoRechazo && (
                  <p style={{ fontSize: 13, opacity: 0.9 }}>
                    Motivo del rechazo: {motivoRechazo}
                  </p>
                )}

                <div className="btn-group">
                  {/* TÉCNICO / ADMIN: Enviar a revisión */}
                  {puedeEnviarRevision && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => cambiarEstado('REVISION')}
                    >
                      Enviar a revisión
                    </button>
                  )}

                  {/* COORDINADOR / ADMIN: Aprobar / Rechazar en REVISION */}
                  {(esCoordinador || esAdmin) &&
                    estadoCodigo === 'REVISION' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => cambiarEstado('APROBADO')}
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={handleRechazar}
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                </div>
              </div>
            </section>

            {/* Sección de indicios */}
            <section className="card" style={{ marginTop: 24 }}>
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <h3>Indicios</h3>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    puedeGestionarIndicios ? abrirNuevoIndicio : undefined
                  }
                  style={{ marginLeft: 'auto' }}
                  disabled={!puedeGestionarIndicios}
                >
                  + Agregar indicio
                </button>
              </div>

              {indiciosMsg && (
                <div
                  style={{
                    margin: '8px 16px 0',
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor:
                      indiciosMsgType === 'success'
                        ? 'rgba(40, 167, 69, 0.35)'
                        : 'rgba(220, 53, 69, 0.35)',
                    border:
                      indiciosMsgType === 'success'
                        ? '1px solid #28a745'
                        : '1px solid #dc3545',
                    color: '#ffffff',
                    fontSize: 14,
                  }}
                >
                  {indiciosMsg}
                </div>
              )}

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Color</th>
                      <th>Tamaño</th>
                      <th>Peso</th>
                      <th>Ubicación</th>
                      <th style={{ width: 60, textAlign: 'center' }}>Editar</th>
                      <th style={{ width: 60, textAlign: 'center' }}>
                        Eliminar
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {indicios.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center' }}>
                          No hay indicios registrados.
                        </td>
                      </tr>
                    )}

                    {indicios.map((ind, index) => (
                      <tr key={ind.IdIndicio}>
                        <td>{index + 1}</td>
                        <td>{ind.Nombre}</td>
                        <td>{ind.Descripcion || '—'}</td>
                        <td>{ind.Color || '—'}</td>
                        <td>{ind.Tamano || '—'}</td>
                        <td>
                          {ind.Peso !== null && ind.Peso !== undefined
                            ? `${ind.Peso} kg`
                            : '—'}
                        </td>
                        <td>{ind.Ubicacion || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={!puedeGestionarIndicios}
                            onClick={() => {
                              if (!puedeGestionarIndicios) return;
                              abrirEditarIndicio(ind);
                            }}
                            title="Editar indicio"
                          >
                            ✏️
                          </button>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={!puedeGestionarIndicios}
                            onClick={() => {
                              if (!puedeGestionarIndicios) return;
                              handleEliminarIndicio(ind);
                            }}
                            title="Eliminar indicio"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Modal crear / editar indicio */}
        {showIndicioModal && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h3>{editingIndicio ? 'Editar indicio' : 'Nuevo indicio'}</h3>

              <form onSubmit={handleGuardarIndicio}>
                <div className="form-group">
                  <label className="label">Nombre *</label>
                  <input
                    className="input"
                    name="nombre"
                    value={indicioForm.nombre}
                    onChange={handleIndicioChange}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="label">Descripción</label>
                  <textarea
                    className="input"
                    name="descripcion"
                    rows={3}
                    value={indicioForm.descripcion}
                    onChange={handleIndicioChange}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Color</label>
                  <input
                    className="input"
                    name="color"
                    value={indicioForm.color}
                    onChange={handleIndicioChange}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Tamaño</label>
                  <input
                    className="input"
                    name="tamano"
                    value={indicioForm.tamano}
                    onChange={handleIndicioChange}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Peso (kg)</label>
                  <input
                    className="input"
                    name="peso"
                    value={indicioForm.peso}
                    onChange={handleIndicioChange}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Ubicación</label>
                  <input
                    className="input"
                    name="ubicacion"
                    value={indicioForm.ubicacion}
                    onChange={handleIndicioChange}
                  />
                </div>

                {indicioError && (
                  <p className="text-error" style={{ marginTop: 8 }}>
                    {indicioError}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarIndicioModal}
                    disabled={savingIndicio}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingIndicio}
                  >
                    {savingIndicio
                      ? 'Guardando…'
                      : editingIndicio
                        ? 'Guardar cambios'
                        : 'Guardar indicio'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
