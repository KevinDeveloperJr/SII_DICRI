// src/pages/ExpedienteNuevoPage.jsx - Formulario para creación de un nuevo expediente
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function ExpedienteNuevoPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Campos del formulario
  const [descripcion, setDescripcion] = useState('');
  const [fechaHecho, setFechaHecho] = useState('');
  const [idFiscalia, setIdFiscalia] = useState('');
  const [idTipoCaso, setIdTipoCaso] = useState('');

  // Catálogos
  const [fiscalias, setFiscalias] = useState([]);
  const [tiposCaso, setTiposCaso] = useState([]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Estado del modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [modalNumero, setModalNumero] = useState(null);
  const [modalId, setModalId] = useState(null);

  // Carga inicial de catálogos (fiscalías y tipos de caso)
  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const [respFiscalias, respTipos] = await Promise.all([
          apiFetch('/api/catalogos/fiscalias', { token }),
          apiFetch('/api/catalogos/tipos-caso', { token }),
        ]);

        setFiscalias(respFiscalias.fiscalias || []);
        setTiposCaso(respTipos.tiposCaso || []);
      } catch (err) {
        console.error('Error cargando catálogos', err);
      }
    }
    if (token) cargarCatalogos();
  }, [token]);

  // Envía el formulario para crear el expediente (POST /api/expedientes)
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!descripcion || !idFiscalia || !idTipoCaso || !fechaHecho) {
      setError('Todos los campos marcados con * son obligatorios.');
      return;
    }

    try {
      setSaving(true);

      const data = await apiFetch('/api/expedientes', {
        method: 'POST',
        token,
        body: {
          descripcion,
          idFiscalia: Number(idFiscalia),
          idTipoCaso: Number(idTipoCaso),
          fechaHecho,
        },
      });

      // Abrir modal con número e Id del expediente creado
      setModalNumero(data.numeroExpediente);
      setModalId(data.idExpediente);
      setModalOpen(true);

      // Limpiar formulario
      setDescripcion('');
      setIdFiscalia('');
      setIdTipoCaso('');
      setFechaHecho('');
    } catch (err) {
      setError(err.message || 'Error al crear el expediente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page-content">
        {/* Contenedor centrado para el formulario */}
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Header con título y botón para volver al listado */}
          <div
            className="page-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <h2 style={{ margin: 0 }}>Nuevo expediente</h2>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              ← Volver al listado
            </button>
          </div>

          {/* Card del formulario de creación */}
          <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
            <form onSubmit={handleSubmit}>
              {/* DESCRIPCIÓN */}
              <div className="form-group">
                <label className="label">Descripción *</label>
                <input
                  className="input"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción breve del caso"
                />
              </div>

              {/* FISCALÍA */}
              <div className="form-group">
                <label className="label">Fiscalía *</label>
                <select
                  className="input"
                  value={idFiscalia}
                  onChange={(e) => setIdFiscalia(e.target.value)}
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
                  value={idTipoCaso}
                  onChange={(e) => setIdTipoCaso(e.target.value)}
                >
                  <option value="">Seleccione un tipo de caso…</option>
                  {tiposCaso.map((t) => (
                    <option key={t.IdTipoCaso} value={t.IdTipoCaso}>
                      {t.Nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* FECHA HECHO */}
              <div className="form-group">
                <label className="label">Fecha del hecho *</label>
                <input
                  className="input"
                  type="date"
                  value={fechaHecho}
                  onChange={(e) => setFechaHecho(e.target.value)}
                />
              </div>

              {error && <div className="text-error">{error}</div>}

              <p style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
                Los campos con * son obligatorios.
              </p>

              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Crear expediente'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/')}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Modal de confirmación con número de expediente */}
        {modalOpen && (
          <div className="modal-overlay">
            <div className="modal-content animate">
              <h3 className="modal-title">Expediente creado</h3>

              <p className="modal-text">
                El expediente fue creado con el número:
                <br />
                <strong className="modal-exp">{modalNumero}</strong>
              </p>

              <div className="modal-buttons">
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/expedientes/${modalId}`)}
                >
                  Ver expediente
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
