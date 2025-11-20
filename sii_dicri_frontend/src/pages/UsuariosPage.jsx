// src/pages/UsuariosPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function UsuariosPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Activos');

  // Modal crear usuario
  const [showNuevo, setShowNuevo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    usuario: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    email: '',
    contrasena: '',
    confirmar: '',
    idRol: '' // un solo rol
  });

  // Modal editar usuario
  const [showEditar, setShowEditar] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    idUsuario: null,
    usuario: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    email: '',
    idRol: '',
    activo: 1,
    contrasena: '',           // nueva contraseña (opcional)
    confirmarContrasena: ''   // confirmación (opcional)
  });

  // Solo ADMIN puede entrar
  useEffect(() => {
    if (!user) return;
    const rolesUser = user.roles || [];
    if (!rolesUser.includes('ADMIN')) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!token) return;
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, estadoFiltro, search]);

  async function cargarDatos() {
    try {
      setLoading(true);
      setError('');

      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (estadoFiltro) qs.set('estado', estadoFiltro);

      const [usuariosResp, rolesResp] = await Promise.all([
        apiFetch(`/api/usuarios?${qs.toString()}`, { token }),
        apiFetch('/api/usuarios/roles', { token })
      ]);

      setUsuarios(usuariosResp.usuarios || []);
      setRoles(rolesResp.roles || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error en la petición');
    } finally {
      setLoading(false);
    }
  }

  /* ================= NUEVO USUARIO ================= */

  async function handleCrearUsuario(e) {
    e.preventDefault();
    setFormError('');

    // Validar obligatorios (excepto segundo nombre / segundo apellido)
    if (
      !form.usuario.trim() ||
      !form.primerNombre.trim() ||
      !form.primerApellido.trim() ||
      !form.email.trim() ||
      !form.contrasena.trim()
    ) {
      setFormError('Los campos marcados con * son obligatorios.');
      return;
    }

    // Validación de contraseña (mínimo 6, al menos letra y número)
    if (form.contrasena.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const tieneLetra = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(form.contrasena);
    const tieneNumero = /[0-9]/.test(form.contrasena);

    if (!tieneLetra || !tieneNumero) {
      setFormError('La contraseña debe incluir al menos una letra y un número.');
      return;
    }

    if (form.contrasena !== form.confirmar) {
      setFormError('La contraseña y la confirmación no coinciden.');
      return;
    }

    if (!form.idRol) {
      setFormError('Debe seleccionar un rol.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        usuario: form.usuario.trim(),
        primerNombre: form.primerNombre.trim() || null,
        segundoNombre: form.segundoNombre.trim() || null,
        primerApellido: form.primerApellido.trim() || null,
        segundoApellido: form.segundoApellido.trim() || null,
        email: form.email.trim() || null,
        contrasena: form.contrasena,
        // el backend espera un arreglo, enviamos solo uno
        roles: [Number(form.idRol)]
      };

      const resp = await apiFetch('/api/usuarios', {
        method: 'POST',
        body: payload,
        token
      });

      if (!resp.ok) {
        throw new Error(resp.mensaje || 'No se pudo crear el usuario');
      }

      // Recargar listado y limpiar formulario
      setShowNuevo(false);
      setForm({
        usuario: '',
        primerNombre: '',
        segundoNombre: '',
        primerApellido: '',
        segundoApellido: '',
        email: '',
        contrasena: '',
        confirmar: '',
        idRol: ''
      });
      await cargarDatos();
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Error al crear el usuario.');
    } finally {
      setSaving(false);
    }
  }

  /* ================= EDITAR USUARIO ================= */

  function abrirEditar(u) {
    setEditError('');
    setEditForm({
      idUsuario: u.IdUsuario,
      usuario: u.Usuario,
      primerNombre: u.PrimerNombre || '',
      segundoNombre: u.SegundoNombre || '',
      primerApellido: u.PrimerApellido || '',
      segundoApellido: u.SegundoApellido || '',
      email: u.Email || '',
      idRol: u.IdRolPrincipal != null ? String(u.IdRolPrincipal) : '',
      activo: u.Activo ? 1 : 0,
      contrasena: '',
      confirmarContrasena: ''
    });
    setShowEditar(true);
  }

  /** PUT /api/usuarios/:id  */
  async function handleActualizarUsuario(e) {
    e.preventDefault();
    setEditError('');

    if (
      !editForm.primerNombre.trim() ||
      !editForm.primerApellido.trim() ||
      !editForm.email.trim()
    ) {
      setEditError('Los campos marcados con * son obligatorios.');
      return;
    }

    if (!editForm.idRol) {
      setEditError('Debe seleccionar un rol.');
      return;
    }

    // Contraseña opcional: si el usuario escribe algo, validar
    let nuevaContrasena = null;
    if (editForm.contrasena || editForm.confirmarContrasena) {
      if (editForm.contrasena.length < 6) {
        setEditError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      const tieneLetra = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(editForm.contrasena);
      const tieneNumero = /[0-9]/.test(editForm.contrasena);

      if (!tieneLetra || !tieneNumero) {
        setEditError(
          'La contraseña debe incluir al menos una letra y un número.'
        );
        return;
      }

      if (editForm.contrasena !== editForm.confirmarContrasena) {
        setEditError('La contraseña y la confirmación no coinciden.');
        return;
      }

      nuevaContrasena = editForm.contrasena;
    }

    try {
      setEditSaving(true);

      const payload = {
        primerNombre: editForm.primerNombre.trim() || null,
        segundoNombre: editForm.segundoNombre.trim() || null,
        primerApellido: editForm.primerApellido.trim() || null,
        segundoApellido: editForm.segundoApellido.trim() || null,
        email: editForm.email.trim() || null,
        activo: editForm.activo ? 1 : 0,
        roles: [Number(editForm.idRol)],
        // puede ir null; el backend la ignora si es null
        contrasena: nuevaContrasena
      };

      const resp = await apiFetch(`/api/usuarios/${editForm.idUsuario}`, {
        method: 'PUT',
        body: payload,
        token
      });

      if (!resp.ok) {
        throw new Error(resp.mensaje || 'No se pudo actualizar el usuario');
      }

      setShowEditar(false);
      await cargarDatos();
    } catch (err) {
      console.error(err);
      setEditError(err.message || 'Error al actualizar el usuario.');
    } finally {
      setEditSaving(false);
    }
  }

  /* ================= RENDER ================= */

  return (
    <div className="page">
      <Navbar />

      <main className="page-content">
        {/* HEADER */}
        <div
          className="page-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24
          }}
        >
          <div>
            <h2>Panel de usuarios</h2>
            <p
              style={{
                marginTop: 4,
                opacity: 0.75,
                fontSize: 14
              }}
            >
              Administra las cuentas, roles y estado de los usuarios del sistema.
            </p>
          </div>

          {/* Botones de acciones */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/expedientes')}
            >
              ← Volver a expedientes
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowNuevo(true);
                setFormError('');
              }}
            >
              + Nuevo usuario
            </button>
          </div>
        </div>

        {/* FILTROS */}
        <section
          className="card"
          style={{ marginBottom: 16, padding: '12px 16px' }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ flex: '1 1 260px', minWidth: 220 }}>
              <label className="label" style={{ fontSize: 13 }}>
                Buscar por usuario o nombre
              </label>
              <input
                className="input"
                placeholder="Ej. admin, Juan Pérez"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ flex: '0 0 180px' }}>
              <label className="label" style={{ fontSize: 13 }}>
                Estado
              </label>
              <select
                className="input"
                value={estadoFiltro}
                onChange={e => setEstadoFiltro(e.target.value)}
              >
                <option value="Activos">Activos</option>
                <option value="Inactivos">Inactivos</option>
                <option value="Todos">Todos</option>
              </select>
            </div>
          </div>
        </section>

        {error && (
          <p className="text-error" style={{ marginBottom: 12 }}>
            {error}
          </p>
        )}

        {/* TABLA */}
        {!loading && (
          <section className="card">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Roles</th>
                    <th style={{ width: 120 }}>Estado</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center' }}>
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  )}

                  {usuarios.map(u => {
                    const nombreCompleto = [
                      u.PrimerNombre,
                      u.SegundoNombre,
                      u.PrimerApellido,
                      u.SegundoApellido
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <tr key={u.IdUsuario}>
                        <td>{u.IdUsuario}</td>
                        <td>{u.Usuario}</td>
                        <td>{nombreCompleto || '—'}</td>
                        <td>{u.Email || '—'}</td>
                        <td>{u.Roles || '—'}</td>
                        <td>
                          <span
                            className={
                              u.Activo ? 'pill pill-success' : 'pill pill-danger'
                            }
                          >
                            {u.Activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => abrirEditar(u)}
                          >
                            Editar
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

        {loading && <p>Cargando usuarios…</p>}

        {/* MODAL NUEVO USUARIO */}
        {showNuevo && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h3 className="modal-title" style={{ textAlign: 'left' }}>
                Nuevo usuario
              </h3>

              {/* Mensaje fijo de ayuda */}
              <p
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  marginTop: 4,
                  marginBottom: 12
                }}
              >
                Los campos marcados con{' '}
                <span style={{ color: '#f97316' }}>*</span> son obligatorios.
              </p>

              <form onSubmit={handleCrearUsuario}>
                <div className="form-group">
                  <label className="label">
                    Usuario <span style={{ color: '#f97316' }}>*</span>
                  </label>
                  <input
                    className="input"
                    value={form.usuario}
                    onChange={e =>
                      setForm(prev => ({ ...prev, usuario: e.target.value }))
                    }
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10
                  }}
                >
                  <div className="form-group">
                    <label className="label">
                      Primer nombre{' '}
                      <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <input
                      className="input"
                      value={form.primerNombre}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          primerNombre: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Segundo nombre</label>
                    <input
                      className="input"
                      value={form.segundoNombre}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          segundoNombre: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">
                      Primer apellido{' '}
                      <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <input
                      className="input"
                      value={form.primerApellido}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          primerApellido: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Segundo apellido</label>
                    <input
                      className="input"
                      value={form.segundoApellido}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          segundoApellido: e.target.value
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">
                    Correo electrónico{' '}
                    <span style={{ color: '#f97316' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={e =>
                      setForm(prev => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10
                  }}
                >
                  <div className="form-group">
                    <label className="label">
                      Contraseña <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="input"
                      value={form.contrasena}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          contrasena: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">
                      Confirmar contraseña{' '}
                      <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="input"
                      value={form.confirmar}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          confirmar: e.target.value
                        }))
                      }
                    />
                    <small style={{ fontSize: 11, opacity: 0.7 }}>
                      La contraseña debe tener al menos 6 caracteres e incluir
                      al menos una letra y un número.
                    </small>
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">
                    Rol <span style={{ color: '#f97316' }}>*</span>
                  </label>
                  <select
                    className="input"
                    value={form.idRol}
                    onChange={e =>
                      setForm(prev => ({ ...prev, idRol: e.target.value }))
                    }
                  >
                    <option value="">Seleccione un rol</option>
                    {roles.map(r => (
                      <option key={r.IdRol} value={r.IdRol}>
                        {r.Nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <p className="text-error" style={{ marginTop: 4 }}>
                    {formError}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 16
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowNuevo(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Guardando…' : 'Crear usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL EDITAR USUARIO */}
        {showEditar && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h3 className="modal-title" style={{ textAlign: 'left' }}>
                Editar usuario
              </h3>

              {/* Mensaje fijo de ayuda */}
              <p
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  marginTop: 4,
                  marginBottom: 12
                }}
              >
                Los campos marcados con{' '}
                <span style={{ color: '#f97316' }}>*</span> son obligatorios.
                <br />
                Deja en blanco la contraseña si no deseas cambiarla.
              </p>

              <form onSubmit={handleActualizarUsuario}>
                <div className="form-group">
                  <label className="label">
                    Usuario <span style={{ color: '#f97316' }}>*</span>
                  </label>
                  <input
                    className="input"
                    value={editForm.usuario}
                    disabled
                    readOnly
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10
                  }}
                >
                  <div className="form-group">
                    <label className="label">
                      Primer nombre{' '}
                      <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <input
                      className="input"
                      value={editForm.primerNombre}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          primerNombre: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Segundo nombre</label>
                    <input
                      className="input"
                      value={editForm.segundoNombre}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          segundoNombre: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">
                      Primer apellido{' '}
                      <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <input
                      className="input"
                      value={editForm.primerApellido}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          primerApellido: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Segundo apellido</label>
                    <input
                      className="input"
                      value={editForm.segundoApellido}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          segundoApellido: e.target.value
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">
                    Correo electrónico{' '}
                    <span style={{ color: '#f97316' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={editForm.email}
                    onChange={e =>
                      setEditForm(prev => ({
                        ...prev,
                        email: e.target.value
                      }))
                    }
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10
                  }}
                >
                  <div className="form-group">
                    <label className="label">
                      Rol <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <select
                      className="input"
                      value={editForm.idRol}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          idRol: e.target.value
                        }))
                      }
                    >
                      <option value="">Seleccione un rol</option>
                      {roles.map(r => (
                        <option key={r.IdRol} value={String(r.IdRol)}>
                          {r.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Estado</label>
                    <select
                      className="input"
                      value={editForm.activo}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          activo: Number(e.target.value)
                        }))
                      }
                    >
                      <option value={1}>Activo</option>
                      <option value={0}>Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* CAMBIO DE CONTRASEÑA (OPCIONAL) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginTop: 10
                  }}
                >
                  <div className="form-group">
                    <label className="label">Nueva contraseña</label>
                    <input
                      type="password"
                      className="input"
                      value={editForm.contrasena}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          contrasena: e.target.value
                        }))
                      }
                    />
                    <small style={{ fontSize: 11, opacity: 0.7, display: 'block' }}>
                      Debe tener al menos 6 caracteres e incluir al menos una letra
                      y un número.
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="label">Confirmar contraseña</label>
                    <input
                      type="password"
                      className="input"
                      value={editForm.confirmarContrasena}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          confirmarContrasena: e.target.value
                        }))
                      }
                    />
                  </div>
                </div>

                {editError && (
                  <p className="text-error" style={{ marginTop: 4 }}>
                    {editError}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 16
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditar(false)}
                    disabled={editSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={editSaving}
                  >
                    {editSaving ? 'Guardando…' : 'Guardar cambios'}
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
