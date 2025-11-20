// src/pages/ExpedientesPage.jsx - Listado, filtros y reportes de expedientes
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

// ====== Reportes (Excel / PDF) ======
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Convierte fecha SQL (string/Date) a fecha local sin desfase por zona horaria
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
    const s = fecha.slice(0, 10); // 'YYYY-MM-DD'
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  return null;
}

// Formatea fecha a dd/mm/yyyy
function formatFecha(fecha) {
  const d = toLocalDate(fecha);
  if (!d) return '—';

  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();

  return `${dia}/${mes}/${anio}`;
}

// Etiqueta amigable para el estado
function getEstadoLabel(exp) {
  const codigo = exp.EstadoCodigo || 'SIN_ESTADO';
  const nombre = exp.EstadoNombre || codigo;

  switch (codigo) {
    case 'BORRADOR':
      return 'BORRADOR';
    case 'REVISION':
      return 'EN REVISIÓN';
    case 'APROBADO':
      return 'APROBADO';
    case 'RECHAZADO':
      return 'RECHAZADO';
    default:
      return nombre || 'SIN ESTADO';
  }
}

// Clases visuales para pill de estado
function getEstadoPillClass(exp) {
  const codigo = exp.EstadoCodigo || 'SIN_ESTADO';
  switch (codigo) {
    case 'BORRADOR':
      return 'pill pill-gray';
    case 'REVISION':
      return 'pill pill-warning';
    case 'APROBADO':
      return 'pill pill-success';
    case 'RECHAZADO':
      return 'pill pill-danger';
    default:
      return 'pill pill-gray';
  }
}

// Regla de negocio base: solo BORRADOR / RECHAZADO
function puedeEditarOEliminar(exp) {
  const codigo = exp.EstadoCodigo || 'SIN_ESTADO';
  return codigo === 'BORRADOR' || codigo === 'RECHAZADO';
}

export default function ExpedientesPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const roles = user?.roles || [];
  const esCoordinador = roles.includes('COORDINADOR');

  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros de la vista
  const [searchNumero, setSearchNumero] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Limpia todos los filtros
  function resetFiltros() {
    setSearchNumero('');
    setEstadoFiltro('');
    setFechaDesde('');
    setFechaHasta('');
  }

  // Carga inicial de expedientes desde la API (SP en backend)
  useEffect(() => {
    if (!token) return;
    cargarExpedientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargarExpedientes() {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch('/api/expedientes', { token });
      setExpedientes(data.expedientes || []);
    } catch (err) {
      setError(err.message || 'Error al cargar expedientes.');
    } finally {
      setLoading(false);
    }
  }

  // Estados únicos disponibles en los datos para el combo de filtro
  const estadosDisponibles = useMemo(() => {
    const set = new Set();
    expedientes.forEach(e => {
      const code = e.EstadoCodigo || 'SIN_ESTADO';
      set.add(code);
    });
    return Array.from(set);
  }, [expedientes]);

  // Aplicación de filtros en memoria
  const expedientesFiltrados = useMemo(() => {
    return expedientes.filter(exp => {
      // 1) Filtro por número
      if (searchNumero) {
        const num = (exp.NumeroExpediente || '').toLowerCase();
        if (!num.includes(searchNumero.toLowerCase())) return false;
      }

      // 2) Filtro por estado
      if (estadoFiltro) {
        const code = exp.EstadoCodigo || 'SIN_ESTADO';
        if (code !== estadoFiltro) return false;
      }

      // 3) Filtro por fecha (FechaHecho) usando toLocalDate
      const fechaBase = exp.FechaHecho;
      if (!fechaBase && (fechaDesde || fechaHasta)) {
        return false; // sin FechaHecho y se está filtrando por fechas → excluir
      }

      if (fechaBase && (fechaDesde || fechaHasta)) {
        const f = toLocalDate(fechaBase);

        if (fechaDesde) {
          const d = toLocalDate(fechaDesde);
          if (f < d) return false;
        }

        if (fechaHasta) {
          const h = toLocalDate(fechaHasta);
          h.setDate(h.getDate() + 1); // incluir todo el día fechaHasta
          if (f >= h) return false;
        }
      }
      return true;
    });
  }, [expedientes, searchNumero, estadoFiltro, fechaDesde, fechaHasta]);

  // Resumen numérico para "Informes y estadísticas"
  const resumenEstados = useMemo(() => {
    const resumen = {
      total: expedientesFiltrados.length,
      aprobados: 0,
      rechazados: 0,
      borradores: 0,
      revision: 0
    };

    expedientesFiltrados.forEach(exp => {
      const code = exp.EstadoCodigo || 'SIN_ESTADO';
      switch (code) {
        case 'APROBADO':
          resumen.aprobados += 1;
          break;
        case 'RECHAZADO':
          resumen.rechazados += 1;
          break;
        case 'BORRADOR':
          resumen.borradores += 1;
          break;
        case 'REVISION':
          resumen.revision += 1;
          break;
        default:
          break;
      }
    });

    return resumen;
  }, [expedientesFiltrados]);

  // Reglas de permisos para botón Editar
  function puedeEditarEnTabla(exp) {
    const codigo = exp.EstadoCodigo || 'SIN_ESTADO';

    if (esCoordinador) {
      // Coordinador: solo puede editar cuando el expediente está en REVISION
      return codigo === 'REVISION';
    }

    // Técnico / Admin: BORRADOR o RECHAZADO
    return puedeEditarOEliminar(exp);
  }

  // Reglas de permisos para botón Eliminar
  function puedeEliminarEnTabla(exp) {
    if (esCoordinador) return false; // Coordinador nunca elimina
    return puedeEditarOEliminar(exp); // Técnico / Admin: BORRADOR o RECHAZADO
  }

  // Navega al detalle al hacer click en la fila
  function handleRowClick(id) {
    navigate(`/expedientes/${id}`);
  }

  // Click en EDITAR (lleva al detalle, igual que la fila, pero sin disparar la fila)
  function handleEditarClick(exp) {
    navigate(`/expedientes/${exp.IdExpediente}`);
  }

  // Click en ELIMINAR (DELETE /api/expedientes/:id)
  async function handleEliminarClick(exp) {
    if (!puedeEliminarEnTabla(exp)) return;

    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar el expediente ${exp.NumeroExpediente}?`
    );
    if (!confirmado) return;

    try {
      setLoading(true);
      setError('');
      await apiFetch(`/api/expedientes/${exp.IdExpediente}`, {
        method: 'DELETE',
        token
      });

      await cargarExpedientes();
    } catch (err) {
      setError(err.message || 'Error al eliminar expediente.');
    } finally {
      setLoading(false);
    }
  }

  // Exporta los expedientes filtrados a Excel
  function exportarExcel() {
    if (!expedientesFiltrados.length) return;

    const filas = expedientesFiltrados.map(exp => ({
      ID: exp.IdExpediente,
      Número: exp.NumeroExpediente,
      Título: exp.Titulo,
      Estado: getEstadoLabel(exp),
      'Fecha hecho': formatFecha(exp.FechaHecho || exp.FechaCreacion)
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Expedientes');

    const wbout = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    const hoy = new Date().toISOString().slice(0, 10);
    saveAs(blob, `expedientes_${hoy}.xlsx`);
  }

  // Exporta los expedientes filtrados a PDF
  function exportarPDF() {
    if (!expedientesFiltrados.length) return;

    const doc = new jsPDF('l', 'pt', 'a4');
    const columnas = ['ID', 'Número', 'Título', 'Estado', 'Fecha hecho'];
    const datos = expedientesFiltrados.map(exp => [
      exp.IdExpediente,
      exp.NumeroExpediente,
      exp.Titulo,
      getEstadoLabel(exp),
      formatFecha(exp.FechaHecho || exp.FechaCreacion)
    ]);

    doc.text('Reporte de expedientes', 40, 30);

    autoTable(doc, {
      startY: 45,
      head: [columnas],
      body: datos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [17, 24, 39] }
    });

    const hoy = new Date().toISOString().slice(0, 10);
    doc.save(`expedientes_${hoy}.pdf`);
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page-content">
        {/* Header principal con botón "Nuevo expediente" */}
        <div
          className="page-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 24
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Expedientes</h2>
            <p
              style={{
                marginTop: 4,
                opacity: 0.75,
                fontSize: 14
              }}
            >
              Consulta, filtra y administra los expedientes registrados.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/expedientes/nuevo')}
          >
            + Nuevo expediente
          </button>
        </div>

        {/* Barra de filtros (número, estado, rango de fechas) */}
        <section
          className="card"
          style={{
            marginBottom: 16,
            padding: '14px 18px'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'flex-end'
            }}
          >
            {/* Buscar por número */}
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
              <label className="label" style={{ fontSize: 13 }}>
                Buscar por número
              </label>
              <input
                className="input"
                placeholder="Ej. DICRI-2025-0001"
                value={searchNumero}
                onChange={e => setSearchNumero(e.target.value)}
              />
            </div>

            {/* Filtro por estado */}
            <div style={{ flex: '0 0 180px' }}>
              <label className="label" style={{ fontSize: 13 }}>
                Estado
              </label>
              <select
                className="input"
                value={estadoFiltro}
                onChange={e => setEstadoFiltro(e.target.value)}
              >
                <option value="">Todos</option>
                {estadosDisponibles.map(code => (
                  <option key={code} value={code}>
                    {code === 'SIN_ESTADO' ? 'SIN ESTADO' : code}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha desde */}
            <div style={{ flex: '0 0 180px' }}>
              <label className="label" style={{ fontSize: 13 }}>
                Fecha hecho desde
              </label>
              <input
                type="date"
                className="input"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
              />
            </div>

            {/* Fecha hasta */}
            <div style={{ flex: '0 0 180px' }}>
              <label className="label" style={{ fontSize: 13 }}>
                Fecha hecho hasta
              </label>
              <input
                type="date"
                className="input"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
              />
            </div>

            {/* Botón LIMPIAR FILTROS */}
            <div
              style={{
                flex: '0 0 150px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
              }}
            >
              <label
                className="label"
                style={{ fontSize: 13, visibility: 'hidden' }}
              >
                Limpiar
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-reset-filtros"
                onClick={resetFiltros}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </section>

        {/* Tarjeta de resumen "Informes y estadísticas" */}
        <section
          className="card"
          style={{
            marginBottom: 16,
            padding: '14px 18px'
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 10, fontSize: 15 }}>
            Informes y estadísticas (según filtros aplicados)
          </h3>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            {/* Total registros */}
            <div
              style={{
                flex: '1 1 160px',
                minWidth: 160,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Registros encontrados
              </div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {resumenEstados.total}
              </div>
            </div>

            {/* Aprobados */}
            <div
              style={{
                flex: '1 1 160px',
                minWidth: 160,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(0, 128, 0, 0.08)',
                border: '1px solid rgba(0, 128, 0, 0.25)'
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75 }}>Aprobados</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {resumenEstados.aprobados}
              </div>
            </div>

            {/* Rechazados */}
            <div
              style={{
                flex: '1 1 160px',
                minWidth: 160,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(255, 0, 0, 0.08)',
                border: '1px solid rgba(255, 0, 0, 0.25)'
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75 }}>Rechazados</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {resumenEstados.rechazados}
              </div>
            </div>

            {/* En revisión */}
            <div
              style={{
                flex: '1 1 160px',
                minWidth: 160,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(255, 255, 0, 0.06)',
                border: '1px solid rgba(255, 255, 0, 0.25)'
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75 }}>En revisión</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {resumenEstados.revision}
              </div>
            </div>

            {/* Borradores */}
            <div
              style={{
                flex: '1 1 160px',
                minWidth: 160,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(128, 128, 128, 0.08)',
                border: '1px solid rgba(128, 128, 128, 0.25)'
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75 }}>Borradores</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {resumenEstados.borradores}
              </div>
            </div>
          </div>
        </section>

        {loading && <p>Cargando expedientes…</p>}
        {error && <p className="text-error">{error}</p>}

        {/* Tabla de expedientes + botones de exportación */}
        {!loading && !error && (
          <section className="card">
            <div
              className="card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15 }}>Listado de expedientes</h3>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={exportarExcel}
                  disabled={!expedientesFiltrados.length}
                >
                  Exportar Excel
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={exportarPDF}
                  disabled={!expedientesFiltrados.length}
                >
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th>Número</th>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Fecha hecho</th>
                    <th style={{ width: 150 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center' }}>
                        No se encontraron expedientes con los filtros aplicados.
                      </td>
                    </tr>
                  )}

                  {expedientesFiltrados.map((exp, index) => {   
                    const puedeEditar = puedeEditarEnTabla(exp);
                    const puedeEliminar = puedeEliminarEnTabla(exp);

                    const orden = index + 1;                 

                    return (
                      <tr
                        key={exp.IdExpediente}
                        onClick={() => handleRowClick(exp.IdExpediente)}
                        className="clickable"
                      >
                        <td>{orden}</td>                        
                        <td>{exp.NumeroExpediente}</td>
                        <td>{exp.Titulo}</td>
                        <td>
                          <span className={getEstadoPillClass(exp)}>
                            {getEstadoLabel(exp)}
                          </span>
                        </td>
                        <td>{formatFecha(exp.FechaHecho || exp.FechaCreacion)}</td>
                        <td className="acciones-cell">
                          <button
                            type="button"
                            className={`btn-accion btn-accion-editar ${puedeEditar ? '' : 'is-disabled'
                              }`}
                            disabled={!puedeEditar}
                            onClick={e => {
                              e.stopPropagation();
                              handleEditarClick(exp);
                            }}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className={`btn-accion btn-accion-eliminar ${puedeEliminar ? '' : 'is-disabled'
                              }`}
                            disabled={!puedeEliminar}
                            onClick={e => {
                              e.stopPropagation();
                              handleEliminarClick(exp);
                            }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
